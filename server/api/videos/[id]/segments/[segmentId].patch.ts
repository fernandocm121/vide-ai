import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { transcriptSegments, transcripts, videos } from '../../../../db/schema'

const Body = z.object({
  text: z.string().max(5000),
})

/**
 * Edita o texto de um segmento e mantém `transcripts.text` sincronizado
 * (recalculado como a junção de todos os segmentos, na ordem de `idx`) —
 * é isso que os exports TXT/SRT/VTT e o texto corrido acabam refletindo.
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const segmentId = getRouterParam(event, 'segmentId')!
  const db = useDrizzle()

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requisição inválida',
      data: parsed.error.issues,
    })
  }
  const text = parsed.data.text.trim()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }

  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.videoId, id),
  })
  if (!transcript) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transcrição não encontrada',
    })
  }

  const segment = await db.query.transcriptSegments.findFirst({
    where: and(
      eq(transcriptSegments.id, segmentId),
      eq(transcriptSegments.transcriptId, transcript.id),
    ),
  })
  if (!segment) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Segmento não encontrado',
    })
  }

  const updated = await db.transaction(async (tx) => {
    const [updatedSegment] = await tx
      .update(transcriptSegments)
      .set({ text })
      .where(eq(transcriptSegments.id, segmentId))
      .returning()

    const allSegments = await tx.query.transcriptSegments.findMany({
      where: eq(transcriptSegments.transcriptId, transcript.id),
      orderBy: [asc(transcriptSegments.idx)],
      columns: { text: true },
    })

    await tx
      .update(transcripts)
      .set({ text: allSegments.map((s) => s.text).join(' ') })
      .where(eq(transcripts.id, transcript.id))

    return updatedSegment!
  })

  return updated
})
