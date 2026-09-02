/**
 * Aplica as migrations pendentes. Rodar com: npm run db:migrate
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

try {
  process.loadEnvFile()
} catch {
  // sem .env — vars vêm do ambiente (CI)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[db:migrate] DATABASE_URL não definido. Rode: cp .env.example .env')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
const db = drizzle(sql, { casing: 'snake_case' })

try {
  console.log('▶ aplicando migrations...')
  await migrate(db, { migrationsFolder: './server/db/migrations' })
  console.log('✔ migrations aplicadas')
} catch (err) {
  console.error('✘ falha nas migrations:', err)
  process.exitCode = 1
} finally {
  await sql.end()
}
