import OpenAI, { toFile } from 'openai'
import { useEnv } from '../utils/env'

export interface TranscriptionSegment {
  startMs: number
  endMs: number
  text: string
}

export interface TranscriptionResult {
  text: string
  language: string | null
  durationSeconds: number | null
  segments: TranscriptionSegment[]
}

export interface TranscriptionInput {
  /** Conteúdo do arquivo de áudio. */
  buffer: Buffer
  filename: string
  /** Dica de idioma (ISO-639-1), opcional. */
  language?: string
}

export interface TranscriptionProvider {
  name: string
  transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult>
}

/* ------------------------------------------------------------------ *
 * OpenAI Whisper (whisper-1) — único modelo da OpenAI que devolve
 * timestamps por segmento.
 * ------------------------------------------------------------------ */
let client: OpenAI | null = null

function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: useEnv().OPENAI_API_KEY })
  return client
}

export const openaiWhisper: TranscriptionProvider = {
  name: 'openai:whisper-1',

  async transcribeAudio({ buffer, filename, language }) {
    const file = await toFile(buffer, filename, { type: 'audio/mpeg' })

    const res = await openai().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      ...(language ? { language } : {}),
    })

    // `verbose_json` -> res.text, res.language, res.duration, res.segments[]
    const r = res as unknown as {
      text: string
      language?: string
      duration?: number
      segments?: { start: number; end: number; text: string }[]
    }

    const segments: TranscriptionSegment[] = (r.segments ?? []).map((s) => ({
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      text: s.text.trim(),
    }))

    return {
      text: r.text,
      language: r.language ?? null,
      durationSeconds: r.duration ?? null,
      segments,
    }
  },
}

/** Provider ativo. Trocar aqui quando surgir outra opção (Fase 4+). */
export function transcriptionProvider(): TranscriptionProvider {
  return openaiWhisper
}
