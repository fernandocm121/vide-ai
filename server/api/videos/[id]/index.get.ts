import { and, asc, eq } from 'drizzle-orm'
import { transcriptSegments, transcripts, videos } from '../../../db/schema'

/** Detalhe de um áudio + transcrição (quando pronta) + URL para tocar. */
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

  // só oferece a URL de áudio depois que o upload foi confirmado
  const hasFile = video.storageKey && video.status !== 'uploading'
  const audioUrl = hasFile
    ? await presignGet(video.storageKey!, 3600).catch(() => null)
    : null

  let transcript: {
    text: string
    language: string | null
    provider: string | null
    segments: { idx: number; startMs: number; endMs: number; text: string }[]
  } | null = null

  if (video.status === 'ready') {
    const t = await db.query.transcripts.findFirst({
      where: eq(transcripts.videoId, id),
    })
    if (t) {
      const segments = await db.query.transcriptSegments.findMany({
        where: eq(transcriptSegments.transcriptId, t.id),
        orderBy: [asc(transcriptSegments.idx)],
        columns: { idx: true, startMs: true, endMs: true, text: true },
      })
      transcript = {
        text: t.text,
        language: t.language,
        provider: t.provider,
        segments,
      }
    }
  }

  return { ...video, audioUrl, transcript }
})
