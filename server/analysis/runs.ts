import { and, eq } from 'drizzle-orm'
import { aiGenerationRuns, type AiFeature } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'

/**
 * Rastreia só o estado transitório "gerando"/"falhou" de cada feature de IA.
 * "Pronto" nunca é gravado aqui — é inferido pela existência da linha de
 * conteúdo na tabela da própria feature (videoSummaries, videoChapters...).
 * `variant` discrimina múltiplas gerações da mesma feature (length do
 * resumo, idioma da tradução) — '' pras features com uma instância só.
 */

export async function startRun(
  videoId: string,
  feature: AiFeature,
  variant = '',
): Promise<void> {
  const db = useDrizzle()
  await db
    .insert(aiGenerationRuns)
    .values({ videoId, feature, variant, status: 'generating', error: null })
    .onConflictDoUpdate({
      target: [
        aiGenerationRuns.videoId,
        aiGenerationRuns.feature,
        aiGenerationRuns.variant,
      ],
      set: { status: 'generating', error: null },
    })
}

/** Chamado depois que o conteúdo já foi gravado com sucesso — remove o rastro de "gerando". */
export async function finishRun(
  videoId: string,
  feature: AiFeature,
  variant = '',
): Promise<void> {
  const db = useDrizzle()
  await db
    .delete(aiGenerationRuns)
    .where(
      and(
        eq(aiGenerationRuns.videoId, videoId),
        eq(aiGenerationRuns.feature, feature),
        eq(aiGenerationRuns.variant, variant),
      ),
    )
}

export async function failRun(
  videoId: string,
  feature: AiFeature,
  variant: string,
  message: string,
): Promise<void> {
  const db = useDrizzle()
  await db
    .update(aiGenerationRuns)
    .set({ status: 'failed', error: message })
    .where(
      and(
        eq(aiGenerationRuns.videoId, videoId),
        eq(aiGenerationRuns.feature, feature),
        eq(aiGenerationRuns.variant, variant),
      ),
    )
}

export async function getRunStatus(
  videoId: string,
  feature: AiFeature,
  variant = '',
): Promise<{ status: 'generating' | 'failed'; error: string | null } | null> {
  const db = useDrizzle()
  const run = await db.query.aiGenerationRuns.findFirst({
    where: and(
      eq(aiGenerationRuns.videoId, videoId),
      eq(aiGenerationRuns.feature, feature),
      eq(aiGenerationRuns.variant, variant),
    ),
  })
  if (!run) return null
  return { status: run.status, error: run.error }
}
