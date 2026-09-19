/**
 * Middleware de rota protegida.
 * - `/app/**` exige sessão (senão → `/login?redirect=...`) e e-mail
 *   confirmado (senão → `/confirme-seu-email`).
 * - `/confirme-seu-email` exige sessão; quem já confirmou é mandado de
 *   volta pro app (não faz sentido ficar esperando algo que já aconteceu).
 * - `/login` e `/signup` redirecionam quem já está logado — pro app se
 *   confirmado, ou pra tela de espera se ainda não confirmou o e-mail.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const isAppRoute = to.path === '/app' || to.path.startsWith('/app/')
  const isGuestOnlyRoute = to.path === '/login' || to.path === '/signup'
  const isVerifyWaitRoute = to.path === '/confirme-seu-email'
  if (!isAppRoute && !isGuestOnlyRoute && !isVerifyWaitRoute) return

  const { user, initialized, fetchUser } = useAuth()
  if (!initialized.value) await fetchUser()

  if ((isAppRoute || isVerifyWaitRoute) && !user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  if (isAppRoute && user.value && !user.value.emailVerifiedAt) {
    return navigateTo('/confirme-seu-email')
  }
  if (isVerifyWaitRoute && user.value?.emailVerifiedAt) {
    return navigateTo('/app')
  }
  if (isGuestOnlyRoute && user.value) {
    return navigateTo(
      user.value.emailVerifiedAt ? '/app' : '/confirme-seu-email',
    )
  }
})
