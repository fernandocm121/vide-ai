import { eq, sql } from 'drizzle-orm'
import { jobs, transcripts, usage, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { getObjectBuffer } from '../utils/storage'
import { currentPeriodMonth } from '../utils/usage'
import { transcriptionProvider } from './provider'

/**
 * Processa a transcrição de um áudio, do começo ao fim.
 * Chamado em background: direto pela rota POST /api/videos/:id/transcribe
 * (áudio) ou encadeado por runExtraction() depois de extrair o áudio de um
 * vídeo — nesse caso `sourceKeyOverride` aponta para o áudio extraído, não
 * para o arquivo original. Trata os próprios erros — nunca lança.
 */
export async function runTranscription(
  videoId: string,
  jobId: string,
  sourceKeyOverride?: string,
): Promise<void> {
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
  })
  const sourceKey = sourceKeyOverride ?? video?.storageKey
  if (!video || !sourceKey) {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        error: 'vídeo ou storageKey ausente',
        finishedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
    return
  }

  await Promise.all([
    db
      .update(videos)
      .set({ status: 'transcribing', error: null })
      .where(eq(videos.id, videoId)),
    db
      .update(jobs)
      .set({
        status: 'active',
        startedAt: new Date(),
        attempts: sql`${jobs.attempts} + 1`,
      })
      .where(eq(jobs.id, jobId)),
  ])

  try {
    const buffer = await getObjectBuffer(sourceKey)
    const provider = transcriptionProvider()
    // Com `sourceKeyOverride` o buffer já passou pelo ffmpeg (extração de
    // vídeo, ou normalização de m4a/aac) e é sempre mp3 de verdade — o nome
    // enviado à API precisa refletir isso. Usar o nome original (ex.:
    // "audio.m4a") faria a OpenAI tentar decodificar bytes de mp3 como se
    // fossem outro container e rejeitar como "corrompido".
    const filename = sourceKeyOverride
      ? 'audio.mp3'
      : video.originalFilename || 'audio.mp3'
    const result = await provider.transcribeAudio({
      buffer,
      filename,
      language: video.language ?? undefined,
    })

    const duration = result.durationSeconds
      ? Math.round(result.durationSeconds)
      : (video.durationSeconds ?? null)

    await db.transaction(async (tx) => {
      // retry: descarta a transcrição anterior
      await tx.delete(transcripts).where(eq(transcripts.videoId, videoId))

      await tx.insert(transcripts).values({
        videoId,
        text: result.text,
        provider: provider.name,
        language: result.language,
      })

      await tx
        .update(videos)
        .set({
          status: 'ready',
          error: null,
          durationSeconds: duration,
          language: result.language ?? video.language,
        })
        .where(eq(videos.id, videoId))

      if (duration) {
        await tx.insert(usage).values({
          userId: video.userId,
          videoId,
          kind: 'transcription_seconds',
          quantity: duration,
          periodMonth: currentPeriodMonth(),
        })
      }

      await tx
        .update(jobs)
        .set({
          status: 'completed',
          error: null,
          finishedAt: new Date(),
          result: {
            durationSeconds: duration,
          },
        })
        .where(eq(jobs.id, jobId))
    })

    console.log(`[transcription] vídeo ${videoId} pronto`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await Promise.allSettled([
      db
        .update(videos)
        .set({ status: 'failed', error: message })
        .where(eq(videos.id, videoId)),
      db
        .update(jobs)
        .set({ status: 'failed', error: message, finishedAt: new Date() })
        .where(eq(jobs.id, jobId)),
    ])
    console.error(`[transcription] vídeo ${videoId} falhou: ${message}`)
  }
}
