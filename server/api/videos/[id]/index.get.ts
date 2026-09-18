import { and, eq } from 'drizzle-orm'
import { transcripts, videos } from '../../../db/schema'

/** Detalhe de um vídeo/áudio + transcrição (quando pronta) + URL para tocar. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }

  // só oferece a URL de mídia depois que o upload foi confirmado
  const hasFile = video.storageKey && video.status !== 'uploading'
  const mediaUrl = hasFile
    ? await presignGet(video.storageKey!, 3600).catch(() => null)
    : null

  let transcript: {
    text: string
    language: string | null
    provider: string | null
  } | null = null

  if (video.status === 'ready') {
    const t = await db.query.transcripts.findFirst({
      where: eq(transcripts.videoId, id),
    })
    if (t) {
      transcript = {
        text: t.text,
        language: t.language,
        provider: t.provider,
      }
    }
  }

  return { ...video, mediaUrl, transcript }
})
