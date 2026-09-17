import OpenAI, { toFile } from 'openai'
import { useEnv } from '../utils/env'

export interface TranscriptionResult {
  text: string
  language: string | null
  durationSeconds: number | null
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
 * OpenAI gpt-transcribe — sucessor do whisper-1. Não suporta
 * `verbose_json`/`timestamp_granularities` (confirmado direto na API: erro
 * 400 "response_format 'verbose_json' is not compatible with model
 * 'gpt-transcribe'"), então não há timestamps por segmento — só `text` e
 * `languages` no `response_format: 'json'`.
 * ------------------------------------------------------------------ */
let client: OpenAI | null = null

function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: useEnv().OPENAI_API_KEY })
  return client
}

export const openaiGptTranscribe: TranscriptionProvider = {
  name: 'openai:gpt-transcribe',

  async transcribeAudio({ buffer, filename, language }) {
    const file = await toFile(buffer, filename, { type: 'audio/mpeg' })

    const res = await openai().audio.transcriptions.create({
      file,
      model: 'gpt-transcribe',
      response_format: 'json',
      ...(language ? { language } : {}),
    })

    const r = res as unknown as {
      text: string
      languages?: { code: string }[]
      usage?: { type: 'duration'; seconds: number } | { type: 'tokens' }
    }

    return {
      text: r.text,
      language: r.languages?.[0]?.code ?? null,
      durationSeconds: r.usage?.type === 'duration' ? r.usage.seconds : null,
    }
  },
}

/** Provider ativo. Trocar aqui quando surgir outra opção (Fase 4+). */
export function transcriptionProvider(): TranscriptionProvider {
  return openaiGptTranscribe
}
