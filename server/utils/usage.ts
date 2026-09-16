import { and, eq, sql } from 'drizzle-orm'
import { usage } from '../db/schema'
import { useDrizzle } from './drizzle'

/** 'YYYY-MM' do mês corrente — mesma chave usada em `usage.periodMonth`. */
export function currentPeriodMonth(d = new Date()): string {
  return d.toISOString().slice(0, 7)
}

/** Soma de segundos de transcrição já consumidos pelo usuário no mês. */
export async function getMonthlyTranscriptionSeconds(
  userId: string,
  periodMonth = currentPeriodMonth(),
): Promise<number> {
  const db = useDrizzle()
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usage.quantity}), 0)` })
    .from(usage)
    .where(
      and(
        eq(usage.userId, userId),
        eq(usage.kind, 'transcription_seconds'),
        eq(usage.periodMonth, periodMonth),
      ),
    )
  return Number(row?.total ?? 0)
}
