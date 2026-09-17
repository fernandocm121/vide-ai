import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { sessions } from '../db/schema'
import { useDrizzle } from './drizzle'

/**
 * Sessão por token opaco guardado em cookie httpOnly, resolvido contra a
 * tabela `sessions`. Sem JWT/assinatura: o token em si já é o segredo
 * (256 bits aleatórios), então revogar é só apagar a linha no banco.
 */
const COOKIE_NAME = 'videai_session'
const SHORT_TTL_MS = 1000 * 60 * 60 * 24 // 1 dia — sessão sem "manter conectado"
const REMEMBER_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 dias

export async function createSession(
  event: H3Event,
  userId: string,
  opts: { remember?: boolean } = {},
): Promise<void> {
  const db = useDrizzle()
  const token = randomBytes(32).toString('hex')
  const ttl = opts.remember ? REMEMBER_TTL_MS : SHORT_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)

  await db.insert(sessions).values({ id: token, userId, expiresAt })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.dev ? false : true,
    path: '/',
    // sem `maxAge`: cookie de sessão (expira ao fechar o navegador) quando
    // "manter conectado" está desmarcado — a linha no banco ainda expira em
    // 1 dia de qualquer forma.
    ...(opts.remember ? { maxAge: REMEMBER_TTL_MS / 1000 } : {}),
  })
}

export async function destroySession(event: H3Event): Promise<void> {
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    const db = useDrizzle()
    await db.delete(sessions).where(eq(sessions.id, token))
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/** Apaga todas as sessões de um usuário (usado ao trocar a senha). */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  const db = useDrizzle()
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, COOKIE_NAME)
}
