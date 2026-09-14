import { and, eq, exists, inArray, lt } from 'drizzle-orm'
import { jobs, videos } from '../db/schema'
import { useDrizzle } from '../utils/drizzle'

/**
 * Marca como `failed` processamentos que ficaram presos em
 * `queued`/`extracting`/`transcribing` (ex.: o servidor reiniciou no meio).
 * Roda no boot. A Fase 4 substitui isso pela reentrega automática do BullMQ.
 *
 * Só mexe em vídeos com um job realmente pendente (`audio_extract` ou
 * `transcribe` em `queued`/`active`) — `queued` também é o estado normal de
 * um upload recém-concluído que ainda não foi mandado processar, e esse não
 * pode ser confundido com um job que travou no meio do caminho.
 */
export async function sweepStaleTranscriptions(
  maxAgeMinutes = 15,
): Promise<number> {
  const db = useDrizzle()
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000)
  const reason = 'Processamento interrompido (reinício do servidor).'

  const hasPendingJob = exists(
    db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.videoId, videos.id),
          inArray(jobs.status, ['queued', 'active']),
        ),
      ),
  )

  const stale = await db
    .update(videos)
    .set({ status: 'failed', error: reason })
    .where(
      and(
        inArray(videos.status, ['queued', 'extracting', 'transcribing']),
        lt(videos.updatedAt, cutoff),
        hasPendingJob,
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
