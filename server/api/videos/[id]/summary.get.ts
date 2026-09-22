import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getRunStatus } from '../../../analysis/runs'
import { videoSummaries } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

const Query = z.object({
  length: z.enum(['short', 'medium', 'detailed']).default('medium'),
})

/** Estado atual do resumo (vazio/gerando/pronto/erro) — "pronto" é inferido pela linha existir em video_summaries. */
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
  const { length } = parsed.data

  const db = useDrizzle()
  const row = await db.query.videoSummaries.findFirst({
    where: and(
      eq(videoSummaries.videoId, video.id),
      eq(videoSummaries.length, length),
    ),
  })
  if (row) {
    return {
      status: 'ready' as const,
      content: row.content,
      generatedAt: row.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'summary', length)
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
