import { ElevenLabsClient, type ElevenLabs } from '@elevenlabs/elevenlabs-js'
import { useEnv } from '../utils/env'
import { toIso6391 } from './language'
import { parseSrtCues } from './srt'
import { assignWordsToSegments, toMs } from './timestamps'

export interface TranscriptionSegment {
  /** Ordem do segmento na transcrição. */
  idx: number
  startMs: number
  endMs: number
  text: string
}

export interface TranscriptionWord {
  /** Ordem da palavra na transcrição. */
  idx: number
  startMs: number
  endMs: number
  text: string
  /** Confiança do modelo na palavra (log-probabilidade, <= 0). */
  logprob: number
  /** `idx` do segmento que contém a palavra; null quando não há segmentos. */
  segmentIdx: number | null
}

export interface TranscriptionResult {
  text: string
  language: string | null
  durationSeconds: number | null
  /**
   * Opcionais de propósito: provider sem timestamps (ou resposta sem os
   * quadros de legenda) devolve só o texto, e nada mais no fluxo quebra.
   */
  segments?: TranscriptionSegment[]
  words?: TranscriptionWord[]
}

export interface TranscriptionInput {
  /** Conteúdo do arquivo de áudio. */
  buffer: Buffer
  filename: string
  /** MIME do arquivo enviado (`audio/mpeg`, `audio/wav`, ...). */
  mimeType?: string
  /** Dica de idioma (ISO-639-1), opcional. */
  language?: string
}

export interface TranscriptionProvider {
  name: string
  /** Se o provider devolve `segments`/`words` no resultado. */
  supportsTimestamps: boolean
  transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult>
}

/* ------------------------------------------------------------------ *
 * Como as legendas são montadas
 *
 * A API exporta `srt` pronto — com cortes bons, respeitando duração,
 * limite de caracteres e silêncio entre falas — mas não exporta `vtt`.
 * Como o export do Vide AI acontece muito depois da transcrição, a partir
 * do banco, guardamos os blocos do SRT em `transcript_segments` e geramos
 * SRT e VTT a partir deles (`server/utils/subtitles.ts`). Uma fonte, dois
 * formatos com cortes idênticos.
 *
 * (`segmented_json` não serve aqui: ele agrupa por turno de fala e não traz
 * tempo no nível do segmento, só dentro de cada palavra — verificado
 * contra a API real.)
 * ------------------------------------------------------------------ */
const SUBTITLE_OPTIONS = {
  maxCharactersPerLine: 42,
  maxSegmentChars: 84,
  maxSegmentDurationS: 5,
  segmentOnSilenceLongerThanS: 0.8,
  includeSpeakers: false,
  includeTimestamps: true,
} as const

let client: ElevenLabsClient | null = null

function elevenlabs(): ElevenLabsClient {
  if (!client) {
    client = new ElevenLabsClient({ apiKey: useEnv().ELEVENLABS_API_KEY })
  }
  return client
}

/* ------------------------------------------------------------------ *
 * ElevenLabs Scribe v2 — devolve texto, timestamps por palavra e os
 * quadros de legenda numa única chamada.
 * ------------------------------------------------------------------ */
export const elevenlabsScribe: TranscriptionProvider = {
  name: 'elevenlabs:scribe_v2',
  supportsTimestamps: true,

  async transcribeAudio({ buffer, filename, mimeType, language }) {
    const res = await elevenlabs().speechToText.convert({
      modelId: 'scribe_v2',
      file: {
        data: buffer,
        filename,
        contentType: mimeType || 'audio/mpeg',
        contentLength: buffer.byteLength,
      },
      timestampsGranularity: 'word',
      // a API recusa `additionalFormats` sem diarização
      // ("Requesting additional formats must have diarization and timestamps
      // enabled") — vem sem custo extra no Scribe v2, e o speakerId que ela
      // adiciona em cada palavra é simplesmente ignorado por enquanto
      diarize: true,
      additionalFormats: [{ format: 'srt', ...SUBTITLE_OPTIONS }],
      ...(language ? { languageCode: language } : {}),
    })

    // a resposta é uma união: multicanal e webhook não se aplicam aqui
    if (!('words' in res)) {
      throw new Error('resposta inesperada da ElevenLabs (sem palavras)')
    }

    const cues = parseSrtCues(
      decodeAdditionalFormat(res.additionalFormats, 'srt') ?? '',
    )

    const segments: TranscriptionSegment[] = cues.map((cue, i) => ({
      idx: i,
      startMs: cue.startMs,
      endMs: cue.endMs,
      text: cue.text,
    }))

    // `words` também traz espaçamento e eventos de áudio (risada, passos) —
    // só o que é palavra vira linha no banco
    const words = assignWordsToSegments(
      res.words
        .filter((w) => w.type === 'word' && w.start != null && w.end != null)
        .map((w, i) => ({
          idx: i,
          startMs: toMs(w.start!),
          endMs: toMs(w.end!),
          text: w.text,
          logprob: w.logprob,
        })),
      segments,
    )

    return {
      text: res.text,
      language: toIso6391(res.languageCode),
      durationSeconds: res.audioDurationSecs ?? null,
      segments,
      words,
    }
  },
}

/** Conteúdo de um formato extra pedido na transcrição, já decodificado. */
function decodeAdditionalFormat(
  formats: (ElevenLabs.AdditionalFormatResponseModel | undefined)[] | undefined,
  format: string,
): string | null {
  const found = formats?.find((f) => f?.requestedFormat === format)
  if (!found) return null

  return found.isBase64Encoded
    ? Buffer.from(found.content, 'base64').toString('utf8')
    : found.content
}

/** Provider ativo. Trocar aqui quando surgir outra opção. */
export function transcriptionProvider(): TranscriptionProvider {
  return elevenlabsScribe
}
