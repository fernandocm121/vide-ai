import { Redis } from 'ioredis'
import { useEnv } from './env'

/**
 * Conexão única com o Redis (ioredis).
 * Usada pelo healthcheck agora e pela fila BullMQ na Fase 4
 * (o BullMQ recebe conexões dedicadas próprias).
 */
let redis: Redis | null = null

export function useRedis(): Redis {
  if (redis) return redis

  const { REDIS_URL } = useEnv()
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
  })
  redis.on('error', (err) => {
    console.error('[redis]', err.message)
  })
  return redis
}

/** Encerra a conexão (usado no shutdown do servidor). */
export async function closeRedis(): Promise<void> {
  if (!redis) return
  try {
    await redis.quit()
  } catch {
    redis.disconnect()
  }
  redis = null
}
