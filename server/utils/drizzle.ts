import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'
import { useEnv } from './env'

/**
 * Conexão única com o Postgres via drizzle-orm (postgres.js).
 * `useDrizzle()` cria a pool na primeira chamada e reaproveita depois.
 */
let client: ReturnType<typeof postgres> | null = null
let db: PostgresJsDatabase<typeof schema> | null = null

export function useDrizzle(): PostgresJsDatabase<typeof schema> {
  if (db) return db

  const { DATABASE_URL } = useEnv()
  client = postgres(DATABASE_URL, { max: 10 })
  db = drizzle(client, { schema, casing: 'snake_case' })
  return db
}

/** Encerra a pool (usado no shutdown do servidor). */
export async function closeDrizzle(): Promise<void> {
  if (!client) return
  await client.end({ timeout: 5 })
  client = null
  db = null
}

export { schema }
