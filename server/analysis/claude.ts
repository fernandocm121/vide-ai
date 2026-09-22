import Anthropic from '@anthropic-ai/sdk'
import { usage } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'
import { useEnv } from '../utils/env'
import { currentPeriodMonth } from '../utils/usage'

/**
 * Modelo único pras 7 features de IA sobre a transcrição — sem split
 * sonnet/haiku por tarefa (decisão registrada no plano: evitar workaround
 * de múltiplos modelos, mesmo critério já aplicado à escolha do provider
 * de transcrição).
 */
export const ANALYSIS_MODEL = 'claude-sonnet-5'

let client: Anthropic | null = null

export function claudeClient(): Anthropic {
  if (!client) {
    const apiKey = useEnv().ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY não configurada — necessária para as features de IA (resumo, capítulos, etc).',
      )
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Grava input/output tokens de uma chamada ao Claude em `usage`, mesmo padrão do `transcription_seconds` em `runTranscription()`. */
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
