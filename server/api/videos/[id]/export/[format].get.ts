import { and, asc, eq } from 'drizzle-orm'
import { transcriptSegments, transcripts, videos } from '../../../../db/schema'
import {
  sanitizeFilename,
  toSrt,
  toTxt,
  toVtt,
} from '../../../../utils/subtitles'

const CONTENT_TYPES: Record<string, string> = {
  txt: 'text/plain; charset=utf-8',
  srt: 'application/x-subrip; charset=utf-8',
  vtt: 'text/vtt; charset=utf-8',
}

/** Exporta a transcrição pronta em TXT, SRT ou VTT. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const format = getRouterParam(event, 'format') ?? ''

  if (!(format in CONTENT_TYPES)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato inválido. Use txt, srt ou vtt.',
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

  const content =
    format === 'txt'
      ? toTxt(transcript.text)
      : await (async () => {
          const segments = await db.query.transcriptSegments.findMany({
            where: eq(transcriptSegments.transcriptId, transcript.id),
            orderBy: [asc(transcriptSegments.idx)],
            columns: { startMs: true, endMs: true, text: true },
          })
          return format === 'srt' ? toSrt(segments) : toVtt(segments)
        })()

  setResponseHeader(event, 'Content-Type', CONTENT_TYPES[format]!)
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${sanitizeFilename(video.title)}.${format}"`,
  )
  return content
})
