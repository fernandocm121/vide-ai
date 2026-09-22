import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { videoMinutes, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, claudeClient, recordLlmUsage } from './claude'
import { getTranscriptContext } from './context'
import { failRun, finishRun, startRun } from './runs'

const MinutesSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string().describe('Título curto do assunto discutido'),
      description: z.string().describe('1-2 frases de contexto sobre o assunto'),
    }),
  ),
  decisions: z.array(
    z.object({
      text: z.string().describe('A decisão tomada, em 1 frase'),
      note: z
        .string()
        .nullable()
        .describe('Contexto ou justificativa adicional, se houver — senão null'),
    }),
  ),
  tasks: z.array(
    z.object({
      description: z.string().describe('A tarefa/ação combinada'),
      owner: z
        .string()
        .nullable()
        .describe('Nome do responsável mencionado, ou null se não foi especificado'),
      dueDate: z
        .string()
        .nullable()
        .describe('Prazo mencionado (ex.: "sexta-feira", "07/10"), ou null se não foi mencionado'),
    }),
  ),
})

/** Gera (ou regenera) tópicos, decisões e tarefas — a "ata" da transcrição. Nunca lança. */
export async function runMinutes(videoId: string): Promise<void> {
  await startRun(videoId, 'minutes')

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
        'Você transforma transcrições de reuniões/entrevistas de negócio numa ata estruturada: ' +
        'tópicos discutidos, decisões tomadas e tarefas combinadas. Responda no mesmo idioma da ' +
        'transcrição. Se a transcrição não for uma reunião de negócio (ex.: entrevista informal, ' +
        'aula), extraia o que existir de cada categoria e deixe as demais como array vazio — nunca ' +
        'invente decisões ou tarefas que não foram ditas.',
      messages: [
        {
          role: 'user',
          content: `--- TRANSCRIÇÃO ---\n${context.text}`,
        },
      ],
      output_config: { format: zodOutputFormat(MinutesSchema) },
    })

    if (!response.parsed_output) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    await db.transaction(async (tx) => {
      await tx.delete(videoMinutes).where(eq(videoMinutes.videoId, videoId))
      await tx.insert(videoMinutes).values({
        videoId,
        topics: response.parsed_output!.topics,
        decisions: response.parsed_output!.decisions,
        tasks: response.parsed_output!.tasks,
      })
    })

    await recordLlmUsage(video.userId, videoId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })

    await finishRun(videoId, 'minutes')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'minutes', '', message)
    console.error(`[analysis:minutes] vídeo ${videoId} falhou: ${message}`)
  }
}
