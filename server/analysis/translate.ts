import { zodTextFormat } from 'openai/helpers/zod'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { videos, videoTranslations } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { ANALYSIS_MODEL, openaiClient, recordLlmUsage } from './openai'
import { formatSegmentsPrompt, getTranscriptContext, segmentByIdx } from './context'
import { failRun, finishRun, startRun } from './runs'

// nomes em português pro prompt (os prompts do projeto são sempre em pt-BR,
// mesmo instruindo o modelo a responder no idioma-alvo) — mesma curadoria
// de `app/utils/transcription-languages.ts`
const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'português',
  en: 'inglês',
  es: 'espanhol',
  fr: 'francês',
  de: 'alemão',
  it: 'italiano',
  ja: 'japonês',
  ko: 'coreano',
}

const TranslateSchema = z.object({
  text: z
    .string()
    .describe('O texto corrido traduzido, natural no idioma-alvo'),
  segments: z.array(
    z.object({
      idx: z.number().int().describe('O mesmo #idx do segmento original'),
      translatedText: z.string(),
    }),
  ),
})

/** Traduz (ou retraduz) a transcrição pra um idioma — cacheado por (vídeo, idioma). Nunca lança. */
export async function runTranslate(
  videoId: string,
  language: string,
): Promise<void> {
  await startRun(videoId, 'translate', language)

  try {
    const db = useDrizzle()
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    })
    const context = video ? await getTranscriptContext(videoId) : null
    if (!video || !context) {
      throw new Error('vídeo ou transcrição ausente')
    }

    const languageName = LANGUAGE_NAMES[language] ?? language
    const hasSegments = context.segments.length > 0

    const response = await openaiClient().responses.parse({
      model: ANALYSIS_MODEL,
      max_output_tokens: 8192,
      input: [
        {
          role: 'system',
          content:
            `Você traduz transcrições de áudio/vídeo para ${languageName}. Devolva o texto corrido ` +
            'traduzido de forma natural (não é tradução literal palavra-por-palavra), preservando o ' +
            'sentido e o tom original.' +
            (hasSegments
              ? ' Devolva também a tradução de cada segmento numerado da lista abaixo, um item por ' +
                '#idx, mantendo o mesmo #idx do original — não pule nem combine segmentos.'
              : ' A transcrição não tem segmentos, então devolva "segments" como array vazio.'),
        },
        {
          role: 'user',
          content: hasSegments
            ? `--- SEGMENTOS ---\n${formatSegmentsPrompt(context.segments)}`
            : `--- TRANSCRIÇÃO ---\n${context.text}`,
        },
      ],
      text: { format: zodTextFormat(TranslateSchema, 'translation') },
    })

    if (!response.output_parsed) {
      throw new Error('resposta do modelo não pôde ser interpretada')
    }

    const byIdx = segmentByIdx(context.segments)
    const segments = response.output_parsed.segments
      .map((s) => ({ ...s, original: byIdx.get(s.idx) }))
      .filter((s) => s.original !== undefined)
      .sort((a, b) => a.original!.idx - b.original!.idx)
      .map((s) => ({
        idx: s.original!.idx,
        startMs: s.original!.startMs,
        endMs: s.original!.endMs,
        text: s.translatedText,
      }))

    await db.transaction(async (tx) => {
      await tx
        .delete(videoTranslations)
        .where(
          and(
            eq(videoTranslations.videoId, videoId),
            eq(videoTranslations.language, language),
          ),
        )
      await tx.insert(videoTranslations).values({
        videoId,
        language,
        text: response.output_parsed!.text,
        segments: segments.length ? segments : null,
      })
    })

    if (response.usage) {
      await recordLlmUsage(video.userId, videoId, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })
    }

    await finishRun(videoId, 'translate', language)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(videoId, 'translate', language, message)
    console.error(
      `[analysis:translate] vídeo ${videoId} (${language}) falhou: ${message}`,
    )
  }
}
