/**
 * OAuth 2.0 "authorization code" com o Google, sem SDK — só as 3 chamadas
 * REST necessárias. Mesma filosofia do resto da auth do projeto: nada de
 * dependência nova pra um fluxo simples.
 */
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export function googleCallbackUrl(): string {
  const { public: pub } = useRuntimeConfig()
  return `${pub.siteUrl.replace(/\/$/, '')}/api/auth/google/callback`
}

export function buildGoogleAuthUrl(state: string): string {
  const { GOOGLE_CLIENT_ID } = useEnv()
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: googleCallbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name?: string
}

export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleUserInfo> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = useEnv()

  const tokenRes = await $fetch<{ access_token: string }>(TOKEN_URL, {
    method: 'POST',
    body: {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: googleCallbackUrl(),
      grant_type: 'authorization_code',
    },
  })

  return await $fetch<GoogleUserInfo>(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  })
}
