import { z } from 'zod'
import { runSummary } from '../../../analysis/summary'
import { getOwnedReadyVideo } from '../../../utils/videos'

const Body = z.object({
  length: z.enum(['short', 'medium', 'detailed']).default('medium'),
})

/** Dispara (ou redispara) a geração do resumo em background — mesmo padrão 202 do POST /transcribe. */
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

  runSummary(video.id, parsed.data.length).catch((err) => {
    console.error('[summary] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
