import { z } from 'zod'
import { runTranslate } from '../../../analysis/translate'
import { getOwnedReadyVideo } from '../../../utils/videos'

// mesma curadoria de app/utils/transcription-languages.ts
const Body = z.object({
  language: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko']),
})

/** Dispara (ou redispara) a tradução da transcrição pra um idioma — cacheada por idioma. */
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

  runTranslate(video.id, parsed.data.language).catch((err) => {
    console.error('[translate] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'generating' }
})
