import { and, eq } from 'drizzle-orm'
import { videos } from '../../../db/schema'

/**
 * Apaga o vídeo/áudio: objeto(s) no storage (original + áudio extraído,
 * quando existir) + registro (cascade cuida do resto).
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(getRequestLocale(event), 'videos.notFound'),
    })
  }

  if (video.storageKey) {
    await deleteObject(video.storageKey).catch((err) => {
      console.warn('[delete] falha ao apagar do storage:', err?.message)
    })
  }

  if (video.mediaKind === 'video') {
    const audioKey = await findExtractedAudioKey(id)
    if (audioKey) {
      await deleteObject(audioKey).catch((err) => {
        console.warn('[delete] falha ao apagar áudio extraído:', err?.message)
      })
    }
  }

  // cascade: transcripts, transcript_segments, jobs, usage(video_id -> null)
  await db.delete(videos).where(eq(videos.id, id))

  setResponseStatus(event, 204)
  return null
})
