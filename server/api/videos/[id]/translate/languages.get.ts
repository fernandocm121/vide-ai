import { eq } from 'drizzle-orm'
import { videoTranslations } from '../../../../db/schema'
import { useDrizzle } from '../../../../utils/drizzle'
import { getOwnedReadyVideo } from '../../../../utils/videos'

/** Idiomas já traduzidos (em cache) desse vídeo — usado pro check ✓ no dropdown. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  const db = useDrizzle()
  const rows = await db.query.videoTranslations.findMany({
    where: eq(videoTranslations.videoId, video.id),
    columns: { language: true },
  })
  return { languages: rows.map((r) => r.language) }
})
