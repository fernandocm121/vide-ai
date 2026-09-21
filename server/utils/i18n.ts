import type { H3Event } from 'h3'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../shared/locales'
import de from '../i18n/errors/de.json'
import en from '../i18n/errors/en.json'
import es from '../i18n/errors/es.json'
import fr from '../i18n/errors/fr.json'
import it from '../i18n/errors/it.json'
import ja from '../i18n/errors/ja.json'
import ko from '../i18n/errors/ko.json'
import ptBR from '../i18n/errors/pt-BR.json'

const DEFAULT_LOCALE: SupportedLocale = 'pt-BR'

// Dicionário próprio do server (mensagens de erro), separado de `i18n/locales/`
// (texto de UI do client) — mesmas 8 línguas, mas carregado só no bundle do
// Nitro, sem inflar o payload do client com chaves que ele nunca usa.
const DICTIONARIES: Record<SupportedLocale, Record<string, string>> = {
  'pt-BR': ptBR,
  en,
  es,
  fr,
  de,
  it,
  ja,
  ko,
}

/**
 * Traduz uma mensagem de erro de servidor pra virar `statusMessage`.
 * Idioma sem dicionário ou chave sem tradução caem no pt-BR (idioma padrão);
 * se a chave não existir nem lá, devolve a própria chave — nunca `undefined`
 * vazando pro `statusMessage` que o client mostra direto ao usuário.
 */
export function translateError(
  locale: SupportedLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
  const template = dict[key] ?? DICTIONARIES[DEFAULT_LOCALE]![key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';q=')
      return { tag: (tag ?? '').trim(), q: qPart ? parseFloat(qPart) : 1 }
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
}

function matchSupportedLocale(tag: string): SupportedLocale | undefined {
  const lower = tag.toLowerCase()
  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lower)
  if (exact) return exact
  // idioma sem região (ex.: "en", "pt") -> casa pela língua base do código
  // suportado (ex.: "en-GB" -> "en"; "pt" -> "pt-BR")
  const base = lower.split('-')[0]
  return SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === base)
}

/**
 * Núcleo puro (sem `H3Event`) da resolução de idioma: cookie do
 * `@nuxtjs/i18n` (`i18n_redirected`, mesmo nome configurado em
 * `nuxt.config.ts`) > header `Accept-Language` > `pt-BR`. Separado de
 * `getRequestLocale` pra poder testar sem montar um `H3Event` de mentira.
 */
export function resolveLocale(
  cookieLocale: string | undefined,
  acceptLanguageHeader: string | undefined,
): SupportedLocale {
  if (
    cookieLocale &&
    (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)
  ) {
    return cookieLocale as SupportedLocale
  }

  if (acceptLanguageHeader) {
    for (const tag of parseAcceptLanguage(acceptLanguageHeader)) {
      const matched = matchSupportedLocale(tag)
      if (matched) return matched
    }
  }

  return DEFAULT_LOCALE
}

/**
 * Idioma da requisição atual. Cobre tanto usuário logado (cookie refletindo
 * o idioma escolhido na UI) quanto chamadas sem sessão (ex.: forgot-password
 * antes do login).
 */
export function getRequestLocale(event: H3Event): SupportedLocale {
  return resolveLocale(
    getCookie(event, 'i18n_redirected'),
    getHeader(event, 'accept-language'),
  )
}
