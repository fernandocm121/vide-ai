/**
 * Popula o banco com dados de desenvolvimento. Rodar com: npm run db:seed
 * Idempotente: se o usuário de dev já existe, não faz nada.
 */
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { hashPassword } from '../utils/password'
import * as schema from './schema'

try {
  process.loadEnvFile()
} catch {
  // sem .env
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    '[db:seed] DATABASE_URL não definido. Rode: cp .env.example .env',
  )
  process.exit(1)
}

const DEV_EMAIL = 'dev@videai.local'
const DEV_PASSWORD = 'password'

const sql = postgres(url, { max: 1 })
const db = drizzle(sql, { schema, casing: 'snake_case' })

try {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, DEV_EMAIL),
  })

  if (existing) {
    console.log(`• usuário de dev já existe (${DEV_EMAIL}) — nada a fazer`)
  } else {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: DEV_EMAIL,
        name: 'Dev',
        passwordHash: await hashPassword(DEV_PASSWORD),
        emailVerifiedAt: new Date(),
        plan: 'pro',
      })
      .returning()

    const [video] = await db
      .insert(schema.videos)
      .values({
        userId: user!.id,
        title: 'Exemplo — Podcast #42',
        originalFilename: 'podcast-42.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 734_003_200,
        durationSeconds: 3134,
        language: 'pt',
        status: 'ready',
      })
      .returning()

    const [transcript] = await db
      .insert(schema.transcripts)
      .values({
        videoId: video!.id,
        provider: 'seed',
        language: 'pt',
        text: 'Fala pessoal, bem-vindos a mais um episódio. Hoje a gente vai falar sobre autenticação OAuth. E também um pouco sobre o novo trailer de GTA 6.',
      })
      .returning()

    await db.insert(schema.transcriptSegments).values([
      {
        transcriptId: transcript!.id,
        videoId: video!.id,
        idx: 0,
        startMs: 0,
        endMs: 4200,
        text: 'Fala pessoal, bem-vindos a mais um episódio.',
      },
      {
        transcriptId: transcript!.id,
        videoId: video!.id,
        idx: 1,
        startMs: 4200,
        endMs: 9800,
        text: 'Hoje a gente vai falar sobre autenticação OAuth.',
      },
      {
        transcriptId: transcript!.id,
        videoId: video!.id,
        idx: 2,
        startMs: 9800,
        endMs: 15400,
        text: 'E também um pouco sobre o novo trailer de GTA 6.',
      },
    ])

    await db.insert(schema.usage).values({
      userId: user!.id,
      videoId: video!.id,
      kind: 'transcription_seconds',
      quantity: 3134,
      periodMonth: new Date().toISOString().slice(0, 7),
    })

    console.log(`✔ seed concluído`)
    console.log(`  login: ${DEV_EMAIL}`)
    console.log(`  senha: ${DEV_PASSWORD}`)
  }
} catch (err) {
  console.error('✘ falha no seed:', err)
  process.exitCode = 1
} finally {
  await sql.end()
}
