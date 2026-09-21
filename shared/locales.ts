// Lista única dos idiomas de UI suportados — usada no `nuxt.config.ts` (setup
// do @nuxtjs/i18n) e no server (validação do idioma salvo em `users.preferredLocale`).
// Adicionar um idioma novo: criar `i18n/locales/<code>.json`, registrar em
// `nuxt.config.ts` (`i18n.locales`) e acrescentar o código aqui.
export const SUPPORTED_LOCALES = [
  'pt-BR',
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
