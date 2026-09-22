import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoExtractions, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, claudeClient, recordLlmUsage } from './claude'
import { getTranscriptContext } from './context'
import { failRun, finishRun, startRun } from './runs'

export interface ExtractionField {
  name: string
  type: 'text' | 'number' | 'date' | 'currency'
}

const TYPE_HINTS: Record<ExtractionField['type'], string> = {
  text: 'texto livre',
  number: 'número (só o valor, sem unidade)',
  date: 'data ou período, como foi mencionado no áudio',
  currency: 'valor monetário, com o símbolo/moeda mencionado',
}

/** Gera (ou regenera) a extração pra um conjunto de campos. Nunca lança. */
export async function runExtraction(
  videoId: string,
  fields: ExtractionField[],
): Promise<void> {
  await startRun(videoId, 'extraction')

  try {
    const db = useDrizzle()
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    })
    const context = video ? await getTranscriptContext(videoId) : null
    if (!video || !context) {
      throw new Error('vídeo ou transcrição ausente')
    }

    // schema dinâmico: uma tupla de {name, value} por campo pedido, na mesma
    // ordem — mais confiável que pedir um objeto solto com chaves variáveis
    const ResultSchema = z.object({
      result: z
        .array(
          z.object({
            name: z.string(),
            value: z
              .string()
              .nullable()
              .describe('null se o campo não foi mencionado na transcrição'),
          }),
        )
        .length(fields.length),
    })

    const fieldsList = fields
      .map((f) => `- "${f.name}" (${TYPE_HINTS[f.type]})`)
      .join('\n')

    const response = await claudeClient().messages.parse({
      model: ANALYSIS_MODEL,
      max_tokens: 4096,
      system:
        'Você extrai dados estruturados de transcrições de áudio/vídeo, a partir de uma lista de ' +
        'campos pedidos pelo usuário. Devolva "result" com exatamente um item por campo pedido, na ' +
        'mesma ordem e com o mesmo "name". Quando o campo não foi mencionado na transcrição, ' +
        'devolva value: null — nunca invente um valor.',
      messages: [
        {
          role: 'user',
          content:
            `Campos pedidos:\n${fieldsList}\n\n--- TRANSCRIÇÃO ---\n${context.text}`,
        },
      ],
      output_config: { format: zodOutputFormat(ResultSchema) },
    })

    if (!response.parsed_output) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(videoExtractions)
        .where(eq(videoExtractions.videoId, videoId))
      await tx.insert(videoExtractions).values({
        videoId,
        fields,
        result: response.parsed_output!.result,
      })
    })

    await recordLlmUsage(video.userId, videoId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })

    await finishRun(videoId, 'extraction')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'extraction', '', message)
    console.error(`[analysis:extraction] vídeo ${videoId} falhou: ${message}`)
  }
}
