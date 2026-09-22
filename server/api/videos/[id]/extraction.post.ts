import { z } from 'zod'
import { runExtraction } from '../../../analysis/extraction'
import { getOwnedReadyVideo } from '../../../utils/videos'

const Body = z.object({
  fields: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        type: z.enum(['text', 'number', 'date', 'currency']),
      }),
    )
    .min(1)
    .max(20),
})

/** Dispara (ou redispara, com campos novos/editados) a extração estruturada. */
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

  runExtraction(video.id, parsed.data.fields).catch((err) => {
    console.error('[extraction] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
