import { runContent } from '../../../analysis/content'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Dispara (ou redispara) a geração do pacote de conteúdo pra criadores. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  runContent(video.id).catch((err) => {
    console.error('[content] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
