import { eq } from 'drizzle-orm'
import { videos } from '../../db/schema'

/** Lista os áudios/vídeos do usuário para o dashboard. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const db = useDrizzle()

  return db.query.videos.findMany({
    where: eq(videos.userId, user.id),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
    columns: {
      id: true,
      title: true,
      status: true,
      mediaKind: true,
      durationSeconds: true,
      sizeBytes: true,
      error: true,
      createdAt: true,
    },
  })
})
