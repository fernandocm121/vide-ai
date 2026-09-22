import OpenAI from 'openai'
import { usage } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { useEnv } from '../utils/env'
import { currentPeriodMonth } from '../utils/usage'

/**
 * Modelo único pras 7 features de IA sobre a transcrição — sem split entre
 * modelos por tarefa (mesmo critério já aplicado à escolha do provider de
 * transcrição: nada de workaround com dois modelos). `gpt-5.6-terra` é o
 * tier "balanced middle" da OpenAI — abaixo do flagship (Sol) e acima do
 * tier de volume (Luna), adequado pro tipo de tarefa daqui (resumo,
 * extração, tradução, Q&A — não é trabalho de raciocínio de ponta).
 *
 * Só as features deste módulo usam OpenAI — a transcrição em si
 * (server/transcription/) continua na ElevenLabs Scribe v2, sem relação
 * com isso.
 */
export const ANALYSIS_MODEL = 'gpt-5.6-terra'

let client: OpenAI | null = null

export function openaiClient(): OpenAI {
  if (!client) {
    const apiKey = useEnv().OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY não configurada — necessária para as features de IA (resumo, capítulos, etc).',
      )
    }
    client = new OpenAI({ apiKey })
  }
  return client
}

/** Grava input/output tokens de uma chamada à OpenAI em `usage`, mesmo padrão do `transcription_seconds` em `runTranscription()`. */
export async function recordLlmUsage(
  userId: string,
  videoId: string,
  tokens: { inputTokens: number; outputTokens: number },
): Promise<void> {
  const db = useDrizzle()
  const periodMonth = currentPeriodMonth()
  await db.insert(usage).values([
    {
      userId,
      videoId,
      kind: 'llm_input_tokens',
      quantity: tokens.inputTokens,
      periodMonth,
    },
    {
      userId,
      videoId,
      kind: 'llm_output_tokens',
      quantity: tokens.outputTokens,
      periodMonth,
    },
  ])
}
