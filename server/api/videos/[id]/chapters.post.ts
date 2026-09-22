import { runChapters } from '../../../analysis/chapters'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Dispara (ou redispara) a geração de capítulos em background. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  runChapters(video.id).catch((err) => {
    console.error('[chapters] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
