import { and, inArray, lt } from 'drizzle-orm'
import { jobs, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'

/**
 * Marca como `failed` transcrições que ficaram presas em `queued`/`transcribing`
 * (ex.: o servidor reiniciou no meio do processamento).
 * Roda no boot. A Fase 4 substitui isso pela reentrega automática do BullMQ.
 */
export async function sweepStaleTranscriptions(
  maxAgeMinutes = 15,
): Promise<number> {
  const db = useDrizzle()
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000)
  const reason = 'Processamento interrompido (reinício do servidor).'

  const stale = await db
    .update(videos)
    .set({ status: 'failed', error: reason })
    .where(
      and(
        inArray(videos.status, ['queued', 'transcribing']),
        lt(videos.updatedAt, cutoff),
      ),
    )
    .returning({ id: videos.id })

  if (stale.length) {
    await db
      .update(jobs)
      .set({ status: 'failed', error: reason, finishedAt: new Date() })
      .where(
        and(
          inArray(
            jobs.videoId,
            stale.map((s) => s.id),
          ),
          inArray(jobs.status, ['queued', 'active']),
        ),
      )
    console.warn(
      `[sweep] ${stale.length} transcrição(ões) presa(s) marcada(s) como failed`,
    )
  }

  return stale.length
}
