import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoQaMessages, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, claudeClient, recordLlmUsage } from './claude'
import { formatSegmentsPrompt, getTranscriptContext, segmentByIdx } from './context'

const HISTORY_LIMIT = 20

const AnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      segmentIdx: z
        .number()
        .int()
        .describe('O #idx do segmento de onde veio essa parte da resposta'),
      excerpt: z
        .string()
        .describe('Trecho curto (até ~15 palavras) do segmento citado'),
    }),
  ),
})

export interface QaCitation {
  segmentId: string
  startMs: number
  excerpt: string
}

export interface QaMessage {
  role: 'user' | 'assistant'
  content: string
  citations: QaCitation[] | null
  createdAt: Date
}

/**
 * Responde uma pergunta sobre o vídeo, com citações ancoradas em segmentos
 * reais. Síncrono (diferente dos outros `runX`) — é uma troca de chat
 * comum, não precisa de polling. Erros propagam normalmente pra rota
 * tratar como erro de request, não como "run" falho.
 */
export async function answerQuestion(
  videoId: string,
  question: string,
): Promise<{ answer: string; citations: QaCitation[] }> {
  const db = useDrizzle()
  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
  })
  const context = video ? await getTranscriptContext(videoId) : null
  if (!video || !context) {
    throw new Error('vídeo ou transcrição ausente')
  }

  const history = await db.query.videoQaMessages.findMany({
    where: eq(videoQaMessages.videoId, videoId),
    orderBy: [desc(videoQaMessages.createdAt)],
    limit: HISTORY_LIMIT,
  })
  history.reverse()

  await db.insert(videoQaMessages).values({
    videoId,
    role: 'user',
    content: question,
    citations: null,
  })

  const response = await claudeClient().messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 2048,
    system:
      'Você responde perguntas sobre o conteúdo de uma transcrição de áudio/vídeo, com base ' +
      'exclusivamente no que foi dito nela — nunca invente informação que não está no conteúdo. ' +
      'Quando não souber a resposta a partir da transcrição, diga isso claramente. Sempre que ' +
      'basear a resposta em um trecho específico, cite o #idx do segmento correspondente da lista ' +
      `numerada abaixo. Responda no mesmo idioma da pergunta.\n\n--- SEGMENTOS ---\n${formatSegmentsPrompt(context.segments)}`,
    messages: [
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: question },
    ],
    output_config: { format: zodOutputFormat(AnswerSchema) },
  })

  if (!response.parsed_output) {
    throw new Error('resposta do modelo não pôde ser interpretada')
  }

  const byIdx = segmentByIdx(context.segments)
  const citations: QaCitation[] = response.parsed_output.citations
    .map((c) => ({ ...c, segment: byIdx.get(c.segmentIdx) }))
    .filter((c) => c.segment !== undefined)
    .map((c) => ({
      segmentId: c.segment!.id,
      startMs: c.segment!.startMs,
      excerpt: c.excerpt,
    }))

  await db.insert(videoQaMessages).values({
    videoId,
    role: 'assistant',
    content: response.parsed_output.answer,
    citations: citations.length ? citations : null,
  })

  await recordLlmUsage(video.userId, videoId, {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  return { answer: response.parsed_output.answer, citations }
}

export async function getQaHistory(videoId: string): Promise<QaMessage[]> {
  const db = useDrizzle()
  const rows = await db.query.videoQaMessages.findMany({
    where: eq(videoQaMessages.videoId, videoId),
    orderBy: [asc(videoQaMessages.createdAt)],
  })
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    citations: r.citations,
    createdAt: r.createdAt,
  }))
}
