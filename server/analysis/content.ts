import { zodTextFormat } from 'openai/helpers/zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoContent, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, openaiClient, recordLlmUsage } from './openai'
import { formatSegmentsPrompt, getTranscriptContext, segmentByIdx } from './context'
import { failRun, finishRun, startRun } from './runs'

const ContentSchema = z.object({
  titles: z.array(
    z.object({
      text: z.string(),
      style: z
        .string()
        .describe('Rótulo curto do estilo do título, ex.: "Direto", "Curiosidade", "Número"'),
    }),
  ),
  description: z.string().describe('Descrição pronta pra colar no YouTube'),
  hashtags: z.array(z.string()),
  shortIdeas: z.array(
    z.object({
      startSegmentIdx: z.number().int(),
      endSegmentIdx: z.number().int(),
      hook: z.string().describe('Gancho/título curto do corte'),
      reason: z.string().describe('1 frase: por que esse trecho funciona como Short'),
      script: z
        .array(z.string())
        .describe('Roteiro em poucos beats curtos, pra narrar o corte'),
    }),
  ),
  socialPosts: z.array(
    z.object({
      platform: z.enum(['x', 'instagram', 'linkedin', 'tiktok']),
      text: z.string(),
    }),
  ),
})

/**
 * Gera (ou regenera) o pacote de conteúdo pra criadores: títulos, descrição,
 * ideias de Shorts (ancoradas em segmentos reais) e posts por rede social.
 * Nunca lança.
 */
export async function runContent(videoId: string): Promise<void> {
  await startRun(videoId, 'content')

  try {
    const db = useDrizzle()
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    })
    const context = video ? await getTranscriptContext(videoId) : null
    if (!video || !context) {
      throw new Error('vídeo ou transcrição ausente')
    }

    const hasSegments = context.segments.length > 0

    const response = await openaiClient().responses.parse({
      model: ANALYSIS_MODEL,
      max_output_tokens: 8192,
      input: [
        {
          role: 'system',
          content:
            'Você ajuda criadores a transformar uma transcrição em conteúdo de distribuição: ' +
            '5-6 títulos com estilos variados (direto, curiosidade, número, pergunta...), uma ' +
            'descrição pronta pro YouTube, hashtags relevantes, 2-4 ideias de cortes pra Shorts ' +
            '(com gancho, motivo e roteiro em beats curtos) e um post adaptado ao tom/tamanho de ' +
            'cada rede social (X/Twitter, Instagram, LinkedIn, TikTok). Responda no mesmo idioma da ' +
            'transcrição.' +
            (hasSegments
              ? ' As ideias de Shorts referenciam #idx de segmentos reais da lista abaixo — use ' +
                'sempre um #idx existente pro início e pro fim do corte, nunca invente um número.'
              : ' Esta transcrição não tem segmentos com timestamp, então devolva "shortIdeas" ' +
                'como array vazio.'),
        },
        {
          role: 'user',
          content: hasSegments
            ? `--- SEGMENTOS ---\n${formatSegmentsPrompt(context.segments)}`
            : `--- TRANSCRIÇÃO ---\n${context.text}`,
        },
      ],
      text: { format: zodTextFormat(ContentSchema, 'content') },
    })

    if (!response.output_parsed) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    const byIdx = segmentByIdx(context.segments)
    const shortIdeas = response.output_parsed.shortIdeas
      .map((idea) => ({
        ...idea,
        start: byIdx.get(idea.startSegmentIdx),
        end: byIdx.get(idea.endSegmentIdx),
      }))
      .filter((idea) => idea.start !== undefined && idea.end !== undefined)
      .map((idea) => ({
        startMs: idea.start!.startMs,
        endMs: idea.end!.endMs,
        hook: idea.hook,
        reason: idea.reason,
        script: idea.script,
      }))

    await db.transaction(async (tx) => {
      await tx.delete(videoContent).where(eq(videoContent.videoId, videoId))
      await tx.insert(videoContent).values({
        videoId,
        titles: response.output_parsed!.titles,
        description: response.output_parsed!.description,
        hashtags: response.output_parsed!.hashtags,
        shortIdeas,
        socialPosts: response.output_parsed!.socialPosts,
      })
    })

    if (response.usage) {
      await recordLlmUsage(video.userId, videoId, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })
    }

    await finishRun(videoId, 'content')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'content', '', message)
    console.error(`[analysis:content] vídeo ${videoId} falhou: ${message}`)
  }
}
