import { and, eq } from 'drizzle-orm'
import { transcriptSegments, transcripts, videos } from '../../../../db/schema'
import { sanitizeFilename, toTxt } from '../../../../utils/subtitles'

const FORMATS = ['txt', 'json'] as const
type Format = (typeof FORMATS)[number]

/** Exporta a transcrição pronta em TXT ou JSON. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const format = getRouterParam(event, 'format') ?? ''

  if (!FORMATS.includes(format as Format)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Formato inválido. Use ${FORMATS.join(' ou ')}.`,
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

  const filename = sanitizeFilename(video.title)

  if (format === 'json') {
    const segments = await db.query.transcriptSegments.findMany({
      where: eq(transcriptSegments.transcriptId, transcript.id),
      orderBy: (s, { asc }) => [asc(s.idx)],
    })

    const payload = buildTranscriptExportJson(video, transcript, segments)

    setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    setResponseHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${filename}.json"`,
    )
    return JSON.stringify(payload, null, 2)
  }

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${filename}.txt"`,
  )
  return toTxt(transcript.text)
})
