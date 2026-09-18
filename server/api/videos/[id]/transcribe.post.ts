import { and, eq } from 'drizzle-orm'
import { jobs, videos } from '../../../db/schema'
import { runExtraction } from '../../../transcription/extract'
import { runTranscription } from '../../../transcription/run'
import { planLimitSeconds } from '../../../utils/plans'
import { getMonthlyTranscriptionSeconds } from '../../../utils/usage'

const STARTABLE = ['queued', 'failed'] as const

/**
 * Inicia o processamento do vídeo/áudio em background:
 * - áudio com compatibilidade direta garantida (mp3/wav): vai direto para a
 *   transcrição (gpt-transcribe)
 * - vídeo (mp4/mov/webm) ou áudio sem compatibilidade garantida (m4a/aac,
 *   ver `NEEDS_FFMPEG_NORMALIZATION`): primeiro passa pelo ffmpeg (extrai o
 *   áudio do vídeo, ou só normaliza pra mp3 no caso do áudio), depois
 *   encadeia a mesma transcrição
 *
 * Único ponto de entrada para os dois tipos — é aqui que o limite mensal do
 * plano é checado, antes de gastar a transcrição com o usuário.
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

  const limitSeconds = planLimitSeconds(user.plan)
  const usedSeconds = await getMonthlyTranscriptionSeconds(user.id)
  if (usedSeconds >= limitSeconds) {
    throw createError({
      statusCode: 402,
      statusMessage: `Limite mensal do plano "${user.plan}" atingido: você já usou ${Math.round(usedSeconds / 60)} de ${Math.round(limitSeconds / 60)} minutos disponíveis este mês. Faça upgrade para continuar transcrevendo.`,
    })
  }

  const needsFfmpegFirst =
    video.mediaKind === 'video' ||
    NEEDS_FFMPEG_NORMALIZATION.has(video.mimeType ?? '')

  if (needsFfmpegFirst) {
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
