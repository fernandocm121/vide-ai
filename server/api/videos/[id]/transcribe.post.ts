import { and, eq } from 'drizzle-orm'
import { jobs, videos } from '../../../db/schema'
import { runExtraction } from '../../../transcription/extract'
import { runTranscription } from '../../../transcription/run'
import { planLimitSeconds } from '../../../utils/plans'
import { TranscribeBody } from '../../../utils/transcribe-language'
import { getMonthlyTranscriptionSeconds } from '../../../utils/usage'

const STARTABLE = ['queued', 'failed'] as const

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
 *
 * Body opcional `{ language?: string }`: dica de idioma escolhida
 * manualmente pelo usuário (ausente/vazio = detecção automática). Gravada
 * em `videos.language` antes de disparar o job — `runTranscription()` já
 * repassa esse valor pro provider sozinha (`video.language ?? undefined`
 * em `server/transcription/run.ts`), nenhuma mudança necessária lá.
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const rawBody = await readBody(event).catch(() => undefined)
  const parsedBody = TranscribeBody.safeParse(rawBody ?? {})
  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedBody.error.issues[0]?.message ?? 'Corpo inválido',
    })
  }
  const language = parsedBody.data.language ?? null

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }
  if (!STARTABLE.includes(video.status as (typeof STARTABLE)[number])) {
    throw createError({
      statusCode: 409,
      statusMessage: `Não é possível processar no status "${video.status}"`,
    })
  }

  const limitSeconds = planLimitSeconds(user.plan)
  const usedSeconds = await getMonthlyTranscriptionSeconds(user.id)
  if (usedSeconds >= limitSeconds) {
    throw createError({
      statusCode: 402,
      statusMessage: `Limite mensal do plano "${user.plan}" atingido: você já usou ${Math.round(usedSeconds / 60)} de ${Math.round(limitSeconds / 60)} minutos disponíveis este mês. Faça upgrade para continuar transcrevendo.`,
    })
  }

  // grava a escolha de idioma (ou limpa, no retry com "detecção automática")
  // antes de disparar o job — runExtraction()/runTranscription() leem daqui
  await db
    .update(videos)
    .set({ status: 'queued', error: null, language })
    .where(eq(videos.id, id))

  if (video.mediaKind === 'video') {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'audio_extract', status: 'queued' })
      .returning()

    // background — não bloqueia a resposta
    runExtraction(id, job!.id).catch((err) => {
      console.error('[process] erro não tratado:', err)
    })
  } else {
    const [job] = await db
      .insert(jobs)
      .values({ videoId: id, type: 'transcribe', status: 'queued' })
      .returning()

    // background — não bloqueia a resposta
    runTranscription(id, job!.id).catch((err) => {
      console.error('[transcribe] erro não tratado:', err)
    })
  }

  setResponseStatus(event, 202)
  return { status: 'queued' }
})
