import { asc, eq } from 'drizzle-orm'
import { getRunStatus } from '../../../analysis/runs'
import { videoChapters } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Estado atual dos capítulos — "pronto" é inferido por existirem linhas em video_chapters. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  const db = useDrizzle()
  const rows = await db.query.videoChapters.findMany({
    where: eq(videoChapters.videoId, video.id),
    orderBy: asc(videoChapters.idx),
  })
  if (rows.length) {
    return {
      status: 'ready' as const,
      content: rows.map((r) => ({
        title: r.title,
        description: r.description,
        startMs: r.startMs,
      })),
      generatedAt: rows[0]!.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'chapters')
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
