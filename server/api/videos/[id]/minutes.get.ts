import { eq } from 'drizzle-orm'
import { getRunStatus } from '../../../analysis/runs'
import { videoMinutes } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Estado atual de tópicos/decisões/tarefas — "pronto" é inferido pela linha existir em video_minutes. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  const db = useDrizzle()
  const row = await db.query.videoMinutes.findFirst({
    where: eq(videoMinutes.videoId, video.id),
  })
  if (row) {
    return {
      status: 'ready' as const,
      content: {
        topics: row.topics,
        decisions: row.decisions,
        tasks: row.tasks,
      },
      generatedAt: row.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'minutes')
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
