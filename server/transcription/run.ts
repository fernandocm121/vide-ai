import { eq, sql } from 'drizzle-orm'
import {
  jobs,
  transcripts,
  transcriptSegments,
  transcriptWords,
  usage,
  videos,
} from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { getObjectBuffer } from '../utils/storage'
import { currentPeriodMonth } from '../utils/usage'
import { transcriptionProvider } from './provider'

/**
 * Linhas por INSERT. Uma hora de áudio passa de 10 mil palavras e um insert
 * único estouraria o limite de parâmetros do Postgres (65535).
 */
const INSERT_CHUNK = 500

function chunk<T>(rows: T[], size = INSERT_CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

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
    // áudio de vídeo) e é sempre mp3 de verdade — o nome e o mimeType
    // enviados à API precisam refletir isso, não o arquivo original que o
    // usuário enviou. Só se aplica ao caminho de vídeo: upload de áudio
    // (mp3/wav/m4a/aac) vai direto pro Scribe v2 sem passar por aqui.
    const result = await provider.transcribeAudio({
      buffer,
      filename: sourceKeyOverride
        ? 'audio.mp3'
        : video.originalFilename || 'audio.mp3',
      mimeType: sourceKeyOverride
        ? 'audio/mpeg'
        : (video.mimeType ?? undefined),
      language: video.language ?? undefined,
    })

    const duration = result.durationSeconds
      ? Math.round(result.durationSeconds)
      : (video.durationSeconds ?? null)

    await db.transaction(async (tx) => {
      // retry: descarta a transcrição anterior
      await tx.delete(transcripts).where(eq(transcripts.videoId, videoId))

      const [t] = await tx
        .insert(transcripts)
        .values({
          videoId,
          text: result.text,
          provider: provider.name,
          language: result.language,
        })
        .returning()

      // segmentos e palavras só existem quando o provider devolve timestamps;
      // sem eles a transcrição fica só com o texto corrido
      const segmentIdByIdx = new Map<number, string>()

      if (result.segments?.length) {
        const segmentRows = result.segments.map((seg) => ({
          transcriptId: t!.id,
          videoId,
          idx: seg.idx,
          startMs: seg.startMs,
          endMs: seg.endMs,
          text: seg.text,
        }))

        for (const batch of chunk(segmentRows)) {
          const rows = await tx
            .insert(transcriptSegments)
            .values(batch)
            .returning({
              id: transcriptSegments.id,
              idx: transcriptSegments.idx,
            })

          for (const row of rows) segmentIdByIdx.set(row.idx, row.id)
        }
      }

      if (result.words?.length) {
        const wordRows = result.words.map((w) => ({
          transcriptId: t!.id,
          segmentId:
            w.segmentIdx === null
              ? null
              : (segmentIdByIdx.get(w.segmentIdx) ?? null),
          videoId,
          idx: w.idx,
          startMs: w.startMs,
          endMs: w.endMs,
          text: w.text,
          logprob: w.logprob,
        }))

        for (const batch of chunk(wordRows)) {
          await tx.insert(transcriptWords).values(batch)
        }
      }

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
            segments: result.segments?.length ?? 0,
            words: result.words?.length ?? 0,
          },
        })
        .where(eq(jobs.id, jobId))
    })

    console.log(
      `[transcription] vídeo ${videoId} pronto ` +
        `(${result.segments?.length ?? 0} segmentos, ${result.words?.length ?? 0} palavras)`,
    )
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
