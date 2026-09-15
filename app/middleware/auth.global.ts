/**
 * Middleware de rota protegida.
 * - `/app/**` exige sessão; sem ela, redireciona para `/login?redirect=...`.
 * - `/login` e `/signup` redirecionam quem já está logado para `/app`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const isAppRoute = to.path === '/app' || to.path.startsWith('/app/')
  const isGuestOnlyRoute = to.path === '/login' || to.path === '/signup'
  if (!isAppRoute && !isGuestOnlyRoute) return

  const { user, initialized, fetchUser } = useAuth()
  if (!initialized.value) await fetchUser()

  if (isAppRoute && !user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  if (isGuestOnlyRoute && user.value) {
    return navigateTo('/app')
  }
})
