/**
 * Wrapper seguro sobre o PostHog. Funciona mesmo sem chave configurada
 * (vira no-op), então componentes podem chamar `track()` sem condicionais.
 *
 * Uso:
 *   const { track } = useAnalytics()
 *   track('cta_click', { location: 'hero' })
 */
export function useAnalytics() {
  const { $posthog } = useNuxtApp()

  function track(event: string, properties?: Record<string, unknown>) {
    $posthog?.capture(event, properties)
  }

  function identify(distinctId: string, properties?: Record<string, unknown>) {
    $posthog?.identify(distinctId, properties)
  }

  return { track, identify, posthog: $posthog ?? null }
}
