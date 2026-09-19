import { randomBytes } from 'node:crypto'

const STATE_COOKIE = 'google_oauth_state'
const REDIRECT_COOKIE = 'google_oauth_redirect'
const COOKIE_MAX_AGE = 600 // 10 min — só dura o ida-e-volta do OAuth

/** Só aceita caminhos internos (`/app`, `/app/foo`) — nunca uma URL externa. */
function safeRedirect(path: unknown): string {
  if (typeof path !== 'string') return '/app'
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return '/app'
  }
  return path
}

/** Inicia o login com Google — redireciona pro consentimento do Google. */
export default defineEventHandler((event) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = useEnv()
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return sendRedirect(event, '/login?error=google_not_configured')
  }

  const query = getQuery(event)
  const redirect = safeRedirect(query.redirect)
  const state = randomBytes(16).toString('hex')

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: import.meta.dev ? false : true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
  setCookie(event, STATE_COOKIE, state, cookieOpts)
  setCookie(event, REDIRECT_COOKIE, redirect, cookieOpts)

  return sendRedirect(event, buildGoogleAuthUrl(state))
})
