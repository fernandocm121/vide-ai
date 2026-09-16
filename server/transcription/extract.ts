import { eq, sql } from 'drizzle-orm'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { jobs, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { downloadToFile, putObjectFile } from '../utils/storage'
import { extractAudio } from './ffmpeg'
import { runTranscription } from './run'

/**
 * Extrai o áudio de um vídeo com ffmpeg e encadeia a transcrição.
 * Chamado em background (sem await) pela rota POST /api/videos/:id/transcribe
 * quando `mediaKind === 'video'`. Roda inline no processo do Nitro — funciona
 * bem local/VPS; em serverless (Vercel) só é confiável para vídeos curtos,
 * ver a issue da Fase 4 (worker dedicado) para o caminho de produção.
 * Trata os próprios erros — nunca lança.
 */
export async function runExtraction(
  videoId: string,
  jobId: string,
): Promise<void> {
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
  })
  if (!video?.storageKey) {
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
      .set({ status: 'extracting', error: null })
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

  const workDir = await mkdtemp(join(tmpdir(), 'videai-extract-'))
  const inputPath = join(
    workDir,
    `source${extname(video.storageKey) || '.mp4'}`,
  )
  const outputPath = join(workDir, 'audio.mp3')

  try {
    await downloadToFile(video.storageKey, inputPath)
    await extractAudio(inputPath, outputPath)

    const audioKey = `media/${videoId}/extracted-audio.mp3`
    await putObjectFile(audioKey, outputPath, 'audio/mpeg')

    await db
      .update(jobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        result: { audioKey },
      })
      .where(eq(jobs.id, jobId))

    const [transcribeJob] = await db
      .insert(jobs)
      .values({
        videoId,
        type: 'transcribe',
        status: 'queued',
        payload: { sourceKey: audioKey },
      })
      .returning()

    console.log(
      `[extraction] vídeo ${videoId} — áudio extraído, iniciando transcrição`,
    )
    await runTranscription(videoId, transcribeJob!.id, audioKey)
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
    console.error(`[extraction] vídeo ${videoId} falhou: ${message}`)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
