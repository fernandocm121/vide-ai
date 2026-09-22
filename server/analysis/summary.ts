import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { videos, videoSummaries, type SummaryLength } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, claudeClient, recordLlmUsage } from './claude'
import { getTranscriptContext } from './context'
import { failRun, finishRun, startRun } from './runs'

const SummarySchema = z.object({
  content: z.string().describe('O texto do resumo, em prosa.'),
})

const LENGTH_INSTRUCTIONS: Record<SummaryLength, string> = {
  short: 'Curto: 1 parágrafo, no máximo 4 frases — só a essência.',
  medium: 'Médio: 2 a 3 parágrafos cobrindo os pontos principais.',
  detailed:
    'Detalhado: vários parágrafos cobrindo nuances e detalhes relevantes; pode incluir bullet points pros pontos-chave.',
}

/** Gera (ou regenera) o resumo de um vídeo num length específico. Nunca lança — trata o próprio erro. */
export async function runSummary(
  videoId: string,
  length: SummaryLength,
): Promise<void> {
  await startRun(videoId, 'summary', length)

  try {
    const db = useDrizzle()
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    })
    const context = video ? await getTranscriptContext(videoId) : null
    if (!video || !context) {
      throw new Error('vídeo ou transcrição ausente')
    }

    const response = await claudeClient().messages.parse({
      model: ANALYSIS_MODEL,
      max_tokens: 4096,
      system:
        'Você resume transcrições de áudio/vídeo. Responda no mesmo idioma da transcrição. ' +
        'Seja direto, sem introduções como "esta transcrição fala sobre" — vá direto ao conteúdo.',
      messages: [
        {
          role: 'user',
          content:
            `Resuma a transcrição abaixo. ${LENGTH_INSTRUCTIONS[length]}\n\n` +
            `--- TRANSCRIÇÃO ---\n${context.text}`,
        },
      ],
      output_config: { format: zodOutputFormat(SummarySchema) },
    })

    if (!response.parsed_output) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(videoSummaries)
        .where(
          and(
            eq(videoSummaries.videoId, videoId),
            eq(videoSummaries.length, length),
          ),
        )
      await tx.insert(videoSummaries).values({
        videoId,
        length,
        content: response.parsed_output!.content,
      })
    })

    await recordLlmUsage(video.userId, videoId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })

    await finishRun(videoId, 'summary', length)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'summary', length, message)
    console.error(`[analysis:summary] vídeo ${videoId} (${length}) falhou: ${message}`)
  }
}
