import { eq } from 'drizzle-orm'
import { getRunStatus } from '../../../analysis/runs'
import { videoContent } from '../../../db/schema'
import { useDrizzle } from '../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Estado atual do pacote de conteúdo — "pronto" é inferido pela linha existir em video_content. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  const db = useDrizzle()
  const row = await db.query.videoContent.findFirst({
    where: eq(videoContent.videoId, video.id),
  })
  if (row) {
    return {
      status: 'ready' as const,
      content: {
        titles: row.titles,
        description: row.description,
        hashtags: row.hashtags,
        shortIdeas: row.shortIdeas,
        socialPosts: row.socialPosts,
      },
      generatedAt: row.createdAt,
    }
  }

  const run = await getRunStatus(video.id, 'content')
  if (run) return { status: run.status, error: run.error }

  return { status: 'empty' as const }
})
