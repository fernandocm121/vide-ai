import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { jobs, videos } from '../../../db/schema'
import { runExtraction } from '../../../transcription/extract'
import { runTranscription } from '../../../transcription/run'
import { planLimitSeconds } from '../../../utils/plans'
import { getMonthlyTranscriptionSeconds } from '../../../utils/usage'

const STARTABLE = ['queued', 'failed'] as const

// ISO-639-1/639-3 — a curadoria de opções fica só na UI (app/utils/
// transcription-languages.ts); aqui só validamos formato pra não deixar
// lixo (string vazia, texto arbitrário) chegar em `videos.language`.
// Ausente/omitido = detecção automática do Scribe v2.
const Body = z.object({
  language: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[a-zA-Z-]+$/, 'validation.invalidRequest')
    .optional(),
})

/**
 * Inicia o processamento do vídeo/áudio em background:
 * - áudio (mp3/wav/m4a/aac): vai direto para a transcrição, com o
 *   `mimeType` original do arquivo — o Scribe v2 aceita os formatos
 *   nativamente, sem precisar normalizar com ffmpeg antes
 * - vídeo (mp4/mov/webm): primeiro extrai o áudio com ffmpeg, depois
 *   encadeia a mesma transcrição
 *
 * Único ponto de entrada para os dois tipos — é aqui que o limite mensal do
 * plano é checado, antes de gastar a transcrição com o usuário.
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const locale = getRequestLocale(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.notFound'),
    })
  }
  if (!STARTABLE.includes(video.status as (typeof STARTABLE)[number])) {
    throw createError({
      statusCode: 409,
      statusMessage: translateError(
        locale,
        'videos.invalidStatusForProcessing',
        {
          status: video.status,
        },
      ),
    })
  }

  // corpo é opcional (retrocompatível com o antigo POST sem body nenhum) —
  // `readBody` devolve `undefined` quando a requisição não manda payload
  const rawBody = (await readBody(event).catch(() => undefined)) ?? {}
  const parsed = Body.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(
        locale,
        parsed.error.issues[0]?.message ?? 'validation.invalidRequest',
      ),
    })
  }
  // sempre grava o que veio nesta chamada — inclusive limpando pra `null`
  // quando omitido, senão um reprocessamento que troca pra "detecção
  // automática" continuaria herdando o idioma manual escolhido da vez
  // anterior (STARTABLE inclui 'failed': ver critério "reprocessar permite
  // trocar o idioma").
  const language = parsed.data.language ?? null

  const limitSeconds = planLimitSeconds(user.plan)
  const usedSeconds = await getMonthlyTranscriptionSeconds(user.id)
  if (usedSeconds >= limitSeconds) {
    throw createError({
      statusCode: 402,
      statusMessage: translateError(locale, 'videos.planLimitReached', {
        plan: user.plan,
        used: Math.round(usedSeconds / 60),
        limit: Math.round(limitSeconds / 60),
      }),
    })
  }

  if (video.mediaKind === 'video') {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'audio_extract', status: 'queued' })
      .returning()

    await db
      .update(videos)
      .set({ status: 'queued', error: null, language })
      .where(eq(videos.id, id))

    // background — não bloqueia a resposta
    runExtraction(id, job!.id).catch((err) => {
      console.error('[process] erro não tratado:', err)
    })
  } else {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'transcribe', status: 'queued' })
      .returning()

    await db
      .update(videos)
      .set({ status: 'queued', error: null, language })
      .where(eq(videos.id, id))

    // background — não bloqueia a resposta
    runTranscription(id, job!.id).catch((err) => {
      console.error('[transcribe] erro não tratado:', err)
    })
  }

  setResponseStatus(event, 202)
  return { status: 'queued' }
})
