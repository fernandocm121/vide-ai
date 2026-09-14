import posthog from 'posthog-js'

/**
 * Analytics de produto — PostHog (client-side).
 *
 * Sem `NUXT_PUBLIC_POSTHOG_KEY` o plugin não inicializa: `usePostHog()` passa a
 * devolver um stub silencioso, então o resto do app pode chamar `.capture()`
 * sem checar ambiente (útil em dev e nos previews).
 *
 * Pageviews de SPA são enviados manualmente a cada mudança de rota
 * (`capture_pageview: false` desliga o automático, que só pega o primeiro load).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { posthogKey, posthogHost } = useRuntimeConfig().public

  if (!posthogKey) {
    return { provide: { posthog: null as typeof posthog | null } }
  }

  const client = posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
    defaults: '2025-05-24',
    persistence: 'localStorage+cookie',
  })

  const router = useRouter()
  router.afterEach((to) => {
    nuxtApp.runWithContext(() => {
      client?.capture('$pageview', {
        $current_url: window.location.origin + to.fullPath,
      })
    })
  })

  return { provide: { posthog: client ?? null } }
})
