import { and, asc, count, eq } from 'drizzle-orm'
import {
  transcripts,
  transcriptSegments,
  transcriptWords,
  videos,
} from '../../../db/schema'

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
  // para vídeo, toca o áudio já extraído — nunca o vídeo original; sem
  // extração concluída ainda, não há player (ver findExtractedAudioKey)
  const mediaKey = hasFile
    ? video.mediaKind === 'video'
      ? await findExtractedAudioKey(id)
      : video.storageKey
    : null
  const mediaUrl = mediaKey
    ? await presignGet(mediaKey, 3600).catch(() => null)
    : null

  let transcript: {
    text: string
    language: string | null
    provider: string | null
    segments: {
      id: string
      idx: number
      startMs: number
      endMs: number
      text: string
    }[]
    /** As palavras não vêm aqui (são milhares) — ver GET /api/videos/:id/words. */
    wordCount: number
  } | null = null

  if (video.status === 'ready') {
    const t = await db.query.transcripts.findFirst({
      where: eq(transcripts.videoId, id),
    })
    if (t) {
      const [segments, [words]] = await Promise.all([
        db.query.transcriptSegments.findMany({
          where: eq(transcriptSegments.transcriptId, t.id),
          orderBy: [asc(transcriptSegments.idx)],
          columns: {
            id: true,
            idx: true,
            startMs: true,
            endMs: true,
            text: true,
          },
        }),
        db
          .select({ total: count() })
          .from(transcriptWords)
          .where(eq(transcriptWords.transcriptId, t.id)),
      ])

      transcript = {
        text: t.text,
        language: t.language,
        provider: t.provider,
        segments,
        wordCount: words?.total ?? 0,
      }
    }
  }

  return { ...video, mediaUrl, transcript }
})
