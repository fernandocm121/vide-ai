export interface AuthUser {
  id: string
  name: string | null
  email: string
  plan: 'free' | 'starter' | 'pro' | 'agency'
  emailVerifiedAt: string | null
}

/**
 * Estado de autenticação compartilhado entre componentes/páginas.
 * `fetchUser()` usa `useRequestFetch()` para funcionar em SSR (encaminha o
 * cookie de sessão da requisição original) e no client.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const initialized = useState('auth:initialized', () => false)

  async function fetchUser() {
    // no SSR, `$fetch` não tem acesso ao cookie da requisição original —
    // precisa encaminhar o header `cookie` manualmente.
    const headers = import.meta.server
      ? useRequestHeaders(['cookie'])
      : undefined
    try {
      user.value = await $fetch<AuthUser | null>('/api/auth/me', { headers })
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string, remember = false) {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password, remember },
    })
    user.value = res.user
    initialized.value = true
    return res.user
  }

  async function signup(payload: {
    name: string
    email: string
    password: string
  }) {
    const res = await $fetch<{ user: AuthUser; devVerifyUrl?: string }>(
      '/api/auth/signup',
      { method: 'POST', body: payload },
    )
    user.value = res.user
    initialized.value = true
    return res
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, initialized, fetchUser, login, signup, logout }
}
