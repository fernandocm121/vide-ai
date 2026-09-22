import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoTranslations } from '../../../../../db/schema'
import { sanitizeFilename, toSrt, toTxt, toVtt } from '../../../../../utils/subtitles'
import { getOwnedReadyVideo } from '../../../../../utils/videos'

const FORMATS = {
  txt: { extension: 'txt', contentType: 'text/plain; charset=utf-8' },
  srt: { extension: 'srt', contentType: 'application/x-subrip; charset=utf-8' },
  vtt: { extension: 'vtt', contentType: 'text/vtt; charset=utf-8' },
} as const

type Format = keyof typeof FORMATS

const Query = z.object({
  language: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko']),
})

/** Exporta a transcrição traduzida em TXT, SRT ou VTT — mesmo formato do export original. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)
  const locale = getRequestLocale(event)
  const format = (getRouterParam(event, 'format') ?? '') as Format

  if (!(format in FORMATS)) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'videos.invalidExportFormat'),
    })
  }

  const parsedQuery = Query.safeParse(getQuery(event))
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'validation.invalidRequest'),
    })
  }

  const db = useDrizzle()
  const translation = await db.query.videoTranslations.findFirst({
    where: and(
      eq(videoTranslations.videoId, video.id),
      eq(videoTranslations.language, parsedQuery.data.language),
    ),
  })
  if (!translation) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.transcriptNotFound'),
    })
  }

  let body: string
  if (format === 'txt') {
    body = toTxt(translation.text)
  } else {
    if (!translation.segments?.length) {
      throw createError({
        statusCode: 409,
        statusMessage: translateError(locale, 'videos.noTimestampsForSubtitles'),
      })
    }
    body = format === 'srt' ? toSrt(translation.segments) : toVtt(translation.segments)
  }

  const { extension, contentType } = FORMATS[format]
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${sanitizeFilename(video.title)}.${parsedQuery.data.language}.${extension}"`,
  )
  return body
})
