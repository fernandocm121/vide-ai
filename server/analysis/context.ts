import { asc, eq } from 'drizzle-orm'
import { transcriptSegments, transcripts } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'

export interface TranscriptSegmentRow {
  id: string
  idx: number
  startMs: number
  endMs: number
  text: string
}

export interface TranscriptContext {
  transcriptId: string
  text: string
  segments: TranscriptSegmentRow[]
}

/** Transcrição + segmentos ordenados de um vídeo — base de todas as features de IA. */
export async function getTranscriptContext(
  videoId: string,
): Promise<TranscriptContext | null> {
  const db = useDrizzle()
  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.videoId, videoId),
  })
  if (!transcript) return null

  const segments = await db.query.transcriptSegments.findMany({
    where: eq(transcriptSegments.transcriptId, transcript.id),
    orderBy: asc(transcriptSegments.idx),
  })

  return { transcriptId: transcript.id, text: transcript.text, segments }
}

/**
 * Transcrição como lista numerada de segmentos pro prompt — os schemas de
 * saída pedem `segmentIdx` (não milissegundos) pra nunca depender do modelo
 * "calcular" um timestamp; o servidor resolve idx→ms a partir do banco
 * depois da resposta.
 */
export function formatSegmentsPrompt(segments: TranscriptSegmentRow[]): string {
  return segments
    .map((s) => `#${s.idx} [${Math.round(s.startMs / 1000)}s] ${s.text}`)
    .join('\n')
}

export function segmentByIdx(
  segments: TranscriptSegmentRow[],
): Map<number, TranscriptSegmentRow> {
  return new Map(segments.map((s) => [s.idx, s]))
}
