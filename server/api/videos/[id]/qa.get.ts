import { getQaHistory } from '../../../analysis/qa'
import { getOwnedReadyVideo } from '../../../utils/videos'

/** Histórico de perguntas e respostas desse vídeo — persiste entre reloads. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)

  return { messages: await getQaHistory(video.id) }
})
