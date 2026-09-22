import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoChapters, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, claudeClient, recordLlmUsage } from './claude'
import { formatSegmentsPrompt, getTranscriptContext, segmentByIdx } from './context'
import { failRun, finishRun, startRun } from './runs'

const ChaptersSchema = z.object({
  chapters: z.array(
    z.object({
      segmentIdx: z
        .number()
        .int()
        .describe('O #idx do segmento onde o capítulo começa'),
      title: z.string().describe('Título curto do capítulo'),
      description: z
        .string()
        .nullable()
        .describe('1 frase de contexto sobre o capítulo, ou null'),
    }),
  ),
})

/**
 * Gera (ou regenera) os capítulos. O modelo referencia `segmentIdx` (não
 * milissegundos) — o `startMs` real vem sempre do banco, nunca do modelo.
 * Nunca lança.
 */
export async function runChapters(videoId: string): Promise<void> {
  await startRun(videoId, 'chapters')

  try {
    const db = useDrizzle()
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    })
    const context = video ? await getTranscriptContext(videoId) : null
    if (!video || !context) {
      throw new Error('vídeo ou transcrição ausente')
    }
    if (!context.segments.length) {
      throw new Error(
        'esta transcrição não tem timestamps por segmento — não é possível gerar capítulos',
      )
    }

    const response = await claudeClient().messages.parse({
      model: ANALYSIS_MODEL,
      max_tokens: 4096,
      system:
        'Você divide transcrições de áudio/vídeo em capítulos, no mesmo formato usado em ' +
        'capítulos de vídeo do YouTube. Cada capítulo começa num segmento existente da lista ' +
        'numerada abaixo — responda sempre com o #idx exato de um segmento, nunca invente um ' +
        'número fora da lista. Gere entre 3 e 12 capítulos, cobrindo mudanças reais de assunto. ' +
        'Responda no mesmo idioma da transcrição.',
      messages: [
        {
          role: 'user',
          content: `--- SEGMENTOS ---\n${formatSegmentsPrompt(context.segments)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ChaptersSchema) },
    })

    if (!response.parsed_output) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    const byIdx = segmentByIdx(context.segments)
    const resolved = response.parsed_output.chapters
      .map((c) => ({ ...c, segment: byIdx.get(c.segmentIdx) }))
      .filter((c) => c.segment !== undefined)
      .sort((a, b) => a.segment!.startMs - b.segment!.startMs)

    if (!resolved.length) {
      throw new Error('o modelo não referenciou nenhum segmento válido')
    }

    await db.transaction(async (tx) => {
      await tx.delete(videoChapters).where(eq(videoChapters.videoId, videoId))
      await tx.insert(videoChapters).values(
        resolved.map((c, idx) => ({
          videoId,
          idx,
          title: c.title,
          description: c.description,
          startMs: c.segment!.startMs,
        })),
      )
    })

    await recordLlmUsage(video.userId, videoId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })

    await finishRun(videoId, 'chapters')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'chapters', '', message)
    console.error(`[analysis:chapters] vídeo ${videoId} falhou: ${message}`)
  }
}
