import { z } from 'zod'
import { answerQuestion } from '../../../analysis/qa'
import { getOwnedReadyVideo } from '../../../utils/videos'

const Body = z.object({
  question: z.string().trim().min(1).max(2000),
})

/** Responde uma pergunta sobre o vídeo — síncrono, como um chat comum (sem polling). */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const video = await getOwnedReadyVideo(event, id)
  const locale = getRequestLocale(event)

  const rawBody = (await readBody(event).catch(() => undefined)) ?? {}
  const parsed = Body.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'validation.invalidRequest'),
    })
  }

  try {
    return await answerQuestion(video.id, parsed.data.question)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[qa] vídeo ${video.id} falhou ao responder: ${message}`)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível responder agora. Tente de novo.',
    })
  }
})
