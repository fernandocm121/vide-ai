import { and, desc, eq } from 'drizzle-orm'
import { jobs } from '../db/schema'
import { useDrizzle } from './drizzle'

/**
 * Chave (no storage) do áudio extraído de um vídeo, a partir do job
 * `audio_extract` mais recente já concluído. `null` se a extração ainda
 * não terminou (ou nunca rodou) para esse vídeo.
 */
export async function findExtractedAudioKey(
  videoId: string,
): Promise<string | null> {
  const db = useDrizzle()
  const job = await db.query.jobs.findFirst({
    where: and(
      eq(jobs.videoId, videoId),
      eq(jobs.type, 'audio_extract'),
      eq(jobs.status, 'completed'),
    ),
    orderBy: [desc(jobs.finishedAt)],
  })
  return (job?.result?.audioKey as string | undefined) ?? null
}
