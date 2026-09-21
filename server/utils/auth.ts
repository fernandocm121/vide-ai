import type { H3Event } from 'h3'
import { and, eq, gt } from 'drizzle-orm'
import { sessions, users, type User } from '../db/schema'
import { useDrizzle } from './drizzle'
import { getSessionToken } from './session'

/** Usuário da sessão atual, ou `null` se não estiver logado (cookie ausente/expirado). */
export async function getSessionUser(event: H3Event): Promise<User | null> {
  const token = getSessionToken(event)
  if (!token) return null

  const db = useDrizzle()
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())),
  })
  if (!session) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })
  return user ?? null
}

/** Como `getSessionUser`, mas lança 401 quando não há usuário logado. */
export async function getCurrentUser(event: H3Event): Promise<User> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: translateError(
        getRequestLocale(event),
        'auth.notAuthenticated',
      ),
    })
  }
  return user
}

/** Formato do usuário exposto ao cliente — nunca inclui `passwordHash`. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    emailVerifiedAt: user.emailVerifiedAt,
    preferredLocale: user.preferredLocale,
  }
}

export type PublicUser = ReturnType<typeof toPublicUser>
