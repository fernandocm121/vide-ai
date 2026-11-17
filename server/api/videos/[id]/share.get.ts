import { eq } from 'drizzle-orm'
import { videos } from '../../../db/schema'

/** Link temporário para baixar o arquivo original de um vídeo. */
export default defineEventHandler(async (event) => {
  await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, id),
  })
  if (!video?.storageKey) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(getRequestLocale(event), 'videos.notFound'),
    })
  }

  return { url: await presignGet(video.storageKey, 3600) }
})
