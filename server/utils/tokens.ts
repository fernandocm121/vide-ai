import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { verificationTokens, type VerificationToken } from '../db/schema'
import { useDrizzle } from './drizzle'

const EMAIL_VERIFY_TTL_MS = 1000 * 60 * 60 * 24 // 24h
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30 // 30min

export async function createVerificationToken(
  userId: string,
  kind: VerificationToken['kind'],
): Promise<string> {
  const db = useDrizzle()
  const token = randomBytes(32).toString('hex')
  const ttl =
    kind === 'password_reset' ? PASSWORD_RESET_TTL_MS : EMAIL_VERIFY_TTL_MS

  await db.insert(verificationTokens).values({
    userId,
    token,
    kind,
    expiresAt: new Date(Date.now() + ttl),
  })

  return token
}

/** Valida e consome (marca como usado) um token. `null` se inválido/expirado/já usado. */
export async function consumeVerificationToken(
  token: string,
  kind: VerificationToken['kind'],
): Promise<VerificationToken | null> {
  const db = useDrizzle()
  const row = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.token, token),
      eq(verificationTokens.kind, kind),
      isNull(verificationTokens.usedAt),
    ),
  })
  if (!row || row.expiresAt < new Date()) return null

  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.id, row.id))

  return row
}
