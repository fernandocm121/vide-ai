import { runMinutes } from '../../../analysis/minutes'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Dispara (ou redispara) a geração de tópicos/decisões/tarefas em background. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  runMinutes(video.id).catch((err) => {
    console.error('[minutes] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
