import { and, eq } from 'drizzle-orm'
import { jobs, videos } from '../../../db/schema'
import { runExtraction } from '../../../transcription/extract'
import { runTranscription } from '../../../transcription/run'

const STARTABLE = ['queued', 'failed'] as const

/**
 * Inicia o processamento do vídeo/áudio em background:
 * - áudio (mp3/wav): vai direto para a transcrição (Whisper)
 * - vídeo (mp4/mov/webm): primeiro extrai o áudio com ffmpeg, depois
 *   encadeia a mesma transcrição
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }
  if (!STARTABLE.includes(video.status as (typeof STARTABLE)[number])) {
    throw createError({
      statusCode: 409,
      statusMessage: `Não é possível processar no status "${video.status}"`,
    })
  }

  if (video.mediaKind === 'video') {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'audio_extract', status: 'queued' })
      .returning()

    await db
      .update(videos)
      .set({ status: 'queued', error: null })
      .where(eq(videos.id, id))

    // background — não bloqueia a resposta
    runExtraction(id, job!.id).catch((err) => {
      console.error('[process] erro não tratado:', err)
    })
  } else {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'transcribe', status: 'queued' })
      .returning()

    await db
      .update(videos)
      .set({ status: 'queued', error: null })
      .where(eq(videos.id, id))

    // background — não bloqueia a resposta
    runTranscription(id, job!.id).catch((err) => {
      console.error('[transcribe] erro não tratado:', err)
    })
  }

  setResponseStatus(event, 202)
  return { status: 'queued' }
})
