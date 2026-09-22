import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { videos, type Video } from '../db/schema'
import { useDrizzle } from './drizzle'

/**
 * Carrega um vídeo do usuário logado já com transcrição pronta — checagem
 * compartilhada pelas rotas das features de IA (resumo, capítulos, etc.),
 * que só fazem sentido sobre `status === 'ready'`. Mesma validação de dono
 * que já existia duplicada em `transcribe.post.ts`, isolada aqui.
 */
export async function getOwnedReadyVideo(
  event: H3Event,
  id: string,
): Promise<Video> {
  const user = await getCurrentUser(event)
  const locale = getRequestLocale(event)
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
  if (video.status !== 'ready') {
    throw createError({
      statusCode: 409,
      statusMessage: translateError(locale, 'videos.aiFeatureRequiresTranscript'),
    })
  }
  return video
}
