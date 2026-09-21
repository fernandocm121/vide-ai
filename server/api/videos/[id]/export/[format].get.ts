import { and, asc, eq } from 'drizzle-orm'
import {
  transcriptSegments,
  transcripts,
  transcriptWords,
  videos,
} from '../../../../db/schema'
import { buildTranscriptExportJson } from '../../../../utils/transcript-export'
import {
  sanitizeFilename,
  toSrt,
  toTxt,
  toVtt,
} from '../../../../utils/subtitles'

const FORMATS = {
  txt: { extension: 'txt', contentType: 'text/plain; charset=utf-8' },
  json: {
    extension: 'json',
    contentType: 'application/json; charset=utf-8',
  },
  srt: { extension: 'srt', contentType: 'application/x-subrip; charset=utf-8' },
  vtt: { extension: 'vtt', contentType: 'text/vtt; charset=utf-8' },
} as const

type Format = keyof typeof FORMATS

/** Exporta a transcrição pronta em TXT, JSON, SRT ou VTT. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const locale = getRequestLocale(event)
  const id = getRouterParam(event, 'id')!
  const format = (getRouterParam(event, 'format') ?? '') as Format

  if (!(format in FORMATS)) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'videos.invalidExportFormat'),
    })
  }

  const db = useDrizzle()
  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.notFound'),
    })
  }
  if (video.status !== 'ready') {
    throw createError({
      statusCode: 409,
      statusMessage: translateError(locale, 'videos.transcriptNotReady'),
    })
  }

  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.videoId, id),
  })
  if (!transcript) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.transcriptNotFound'),
    })
  }

  let body: string

  if (format === 'txt') {
    body = toTxt(transcript.text)
  } else if (format === 'json') {
    const [segments, words] = await Promise.all([
      db.query.transcriptSegments.findMany({
        where: eq(transcriptSegments.transcriptId, transcript.id),
        orderBy: [asc(transcriptSegments.idx)],
      }),
      db.query.transcriptWords.findMany({
        where: eq(transcriptWords.transcriptId, transcript.id),
        orderBy: [asc(transcriptWords.idx)],
      }),
    ])

    const payload = buildTranscriptExportJson(
      video,
      transcript,
      segments,
      words,
    )
    body = JSON.stringify(payload, null, 2)
  } else {
    const segments = await db.query.transcriptSegments.findMany({
      where: eq(transcriptSegments.transcriptId, transcript.id),
      orderBy: [asc(transcriptSegments.idx)],
      columns: { startMs: true, endMs: true, text: true },
    })

    // transcrições anteriores à migração para o Scribe v2 não têm timestamps
    if (!segments.length) {
      throw createError({
        statusCode: 409,
        statusMessage: translateError(
          locale,
          'videos.noTimestampsForSubtitles',
        ),
      })
    }

    body = format === 'srt' ? toSrt(segments) : toVtt(segments)
  }

  const { extension, contentType } = FORMATS[format]
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${sanitizeFilename(video.title)}.${extension}"`,
  )
  return body
})
