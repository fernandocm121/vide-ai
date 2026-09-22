import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getRunStatus } from '../../../analysis/runs'
import { videoTranslations } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

const Query = z.object({
  language: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko']),
})

/** Estado da tradução pro idioma pedido — "pronto" é inferido pela linha existir em video_translations. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)
  const locale = getRequestLocale(event)

  const parsed = Query.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'validation.invalidRequest'),
    })
  }
  const { language } = parsed.data

  const db = useDrizzle()
  const row = await db.query.videoTranslations.findFirst({
    where: and(
      eq(videoTranslations.videoId, video.id),
      eq(videoTranslations.language, language),
    ),
  })
  if (row) {
    return {
      status: 'ready' as const,
      content: {
        text: row.text,
        hasSubtitles: !!row.segments?.length,
      },
      generatedAt: row.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'translate', language)
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
