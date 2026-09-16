import { and, eq } from 'drizzle-orm'
import { videos } from '../../../db/schema'

/** Confirma que o PUT no storage foi concluído; move o status para `queued`. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }
  if (video.status !== 'uploading') {
    return { status: video.status } // idempotente
  }

  let contentLength: number | undefined
  try {
    const head = await headObject(video.storageKey!)
    contentLength = head.ContentLength
  } catch {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Arquivo não encontrado no storage — o upload não foi concluído',
    })
  }

  await db
    .update(videos)
    .set({
      status: 'queued',
      sizeBytes: Number(contentLength ?? video.sizeBytes),
    })
    .where(eq(videos.id, id))

  return { status: 'queued' }
})
