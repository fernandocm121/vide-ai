import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { users } from '../../../db/schema'

const STATE_COOKIE = 'google_oauth_state'
const REDIRECT_COOKIE = 'google_oauth_redirect'

function clearOauthCookies(event: H3Event) {
  deleteCookie(event, STATE_COOKIE, { path: '/' })
  deleteCookie(event, REDIRECT_COOKIE, { path: '/' })
}

/** Callback do Google — troca o `code` por dados do usuário e cria a sessão. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const redirectTo = getCookie(event, REDIRECT_COOKIE) || '/app'

  if (query.error) {
    clearOauthCookies(event)
    return sendRedirect(event, '/login?error=google_cancelled')
  }

  const expectedState = getCookie(event, STATE_COOKIE)
  const code = query.code
  if (
    !code ||
    typeof code !== 'string' ||
    !expectedState ||
    query.state !== expectedState
  ) {
    clearOauthCookies(event)
    return sendRedirect(event, '/login?error=google_failed')
  }
  clearOauthCookies(event)

  try {
    const profile = await exchangeGoogleCode(code)
    const db = useDrizzle()

    let user = await db.query.users.findFirst({
      where: eq(users.googleId, profile.sub),
    })

    if (!user) {
      const byEmail = await db.query.users.findFirst({
        where: eq(users.email, profile.email),
      })

      if (byEmail) {
        // conta já existia com senha — só linka o Google a ela.
        const [updated] = await db
          .update(users)
          .set({
            googleId: profile.sub,
            emailVerifiedAt:
              byEmail.emailVerifiedAt ??
              (profile.email_verified ? new Date() : null),
          })
          .where(eq(users.id, byEmail.id))
          .returning()
        user = updated
      } else {
        const [created] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name,
            googleId: profile.sub,
            emailVerifiedAt: profile.email_verified ? new Date() : null,
          })
          .returning()
        user = created
      }
    }

    await createSession(event, user!.id, { remember: true })
  } catch (err) {
    console.error('[auth] falha no login com Google:', err)
    return sendRedirect(event, '/login?error=google_failed')
  }

  return sendRedirect(event, redirectTo)
})
