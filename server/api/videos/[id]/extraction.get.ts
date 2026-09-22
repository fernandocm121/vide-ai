import { eq } from 'drizzle-orm'
import { getRunStatus } from '../../../analysis/runs'
import { videoExtractions } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Estado atual da extração — "pronto" é inferido pela linha existir em video_extractions. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  const db = useDrizzle()
  const row = await db.query.videoExtractions.findFirst({
    where: eq(videoExtractions.videoId, video.id),
  })
  if (row) {
    return {
      status: 'ready' as const,
      content: { fields: row.fields, result: row.result },
      generatedAt: row.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'extraction')
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
