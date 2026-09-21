import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { transcripts, transcriptWords, videos } from '../../../db/schema'

const Query = z.object({
  /** Filtra as palavras de um segmento só. */
  segmentId: z.uuid('deve ser um UUID').optional(),
})

/**
 * Palavras da transcrição com timestamp individual, em ordem. Rota separada de
 * GET /api/videos/:id porque são milhares de linhas por vídeo — o detalhe
 * devolve só `transcript.wordCount` e o client busca aqui quando precisa.
 * Lista vazia quando a transcrição foi feita sem timestamps.
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const locale = getRequestLocale(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const parsed = Query.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'validation.invalidRequest'),
      data: parsed.error.issues,
    })
  }
  const { segmentId } = parsed.data

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
    columns: { id: true },
  })
  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.notFound'),
    })
  }

  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.videoId, id),
    columns: { id: true },
  })
  if (!transcript) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'videos.transcriptNotFound'),
    })
  }

  const words = await db.query.transcriptWords.findMany({
    where: segmentId
      ? and(
          eq(transcriptWords.transcriptId, transcript.id),
          eq(transcriptWords.segmentId, segmentId),
        )
      : eq(transcriptWords.transcriptId, transcript.id),
    orderBy: [asc(transcriptWords.idx)],
    columns: {
      id: true,
      idx: true,
      segmentId: true,
      startMs: true,
      endMs: true,
      text: true,
      logprob: true,
    },
  })

  return { words }
})
