import { sql } from 'drizzle-orm'

type ServiceCheck = {
  status: 'up' | 'down'
  latencyMs: number
  error?: string
}

async function check(fn: () => Promise<unknown>, timeoutMs = 3000): Promise<ServiceCheck> {
  const start = performance.now()
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ])
    return { status: 'up', latencyMs: Math.round(performance.now() - start) }
  } catch (err) {
    let e: unknown = err
    // Desembrulha wrappers comuns até a causa raiz (ECONNREFUSED etc.)
    for (let i = 0; i < 5; i++) {
      if (e instanceof AggregateError && e.errors.length) e = e.errors[0]
      else if (e instanceof Error && e.cause) e = e.cause
      else break
    }
    const message =
      e instanceof Error ? e.message || e.name || e.constructor.name : String(e)
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - start),
      error: message,
    }
  }
}

export default defineEventHandler(async (event) => {
  const [database, redis, storage] = await Promise.all([
    check(() => useDrizzle().execute(sql`select 1`)),
    check(() => useRedis().ping()),
    check(() => checkStorage()),
  ])

  const services = { database, redis, storage }
  const healthy = Object.values(services).every((s) => s.status === 'up')

  setResponseStatus(event, healthy ? 200 : 503)
  return {
    status: healthy ? 'ok' : 'degraded',
    service: 'vide-ai-web',
    time: new Date().toISOString(),
    services,
  }
})
