import { defineConfig } from 'drizzle-kit'

// Carrega o .env para os comandos do drizzle-kit (generate/migrate/studio).
try {
  process.loadEnvFile()
} catch {
  // .env ausente — ok em CI, onde as vars vêm do ambiente
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
