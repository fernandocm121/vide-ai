import { and, eq } from 'drizzle-orm'
import { transcripts, videos } from '../../../../db/schema'
import { sanitizeFilename, toTxt } from '../../../../utils/subtitles'

/** Exporta a transcrição pronta em TXT. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const format = getRouterParam(event, 'format') ?? ''

  if (format !== 'txt') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato inválido. Use txt.',
    })
  }

  const db = useDrizzle()
  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }
  if (video.status !== 'ready') {
    throw createError({
      statusCode: 409,
      statusMessage: 'A transcrição ainda não está pronta para exportar.',
    })
  }

  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.videoId, id),
  })
  if (!transcript) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transcrição não encontrada',
    })
  }

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${sanitizeFilename(video.title)}.txt"`,
  )
  return toTxt(transcript.text)
})
