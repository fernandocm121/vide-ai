import type { H3Event } from 'h3'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../shared/locales'
import errorsDe from '../i18n/errors/de.json'
import errorsEn from '../i18n/errors/en.json'
import errorsEs from '../i18n/errors/es.json'
import errorsFr from '../i18n/errors/fr.json'
import errorsIt from '../i18n/errors/it.json'
import errorsJa from '../i18n/errors/ja.json'
import errorsKo from '../i18n/errors/ko.json'
import errorsPtBR from '../i18n/errors/pt-BR.json'
import emailsDe from '../i18n/emails/de.json'
import emailsEn from '../i18n/emails/en.json'
import emailsEs from '../i18n/emails/es.json'
import emailsFr from '../i18n/emails/fr.json'
import emailsIt from '../i18n/emails/it.json'
import emailsJa from '../i18n/emails/ja.json'
import emailsKo from '../i18n/emails/ko.json'
import emailsPtBR from '../i18n/emails/pt-BR.json'

const DEFAULT_LOCALE: SupportedLocale = 'pt-BR'

type Dictionaries = Record<SupportedLocale, Record<string, string>>

/**
 * Fábrica de tradutor: dado um conjunto de dicionários (um por idioma),
 * devolve uma função `t(locale, key, params?)`. Idioma sem dicionário ou
 * chave sem tradução caem no pt-BR (idioma padrão); se a chave não existir
 * nem lá, devolve a própria chave — nunca `undefined` vazando pro texto que
 * vai direto pro usuário (`statusMessage` de erro, assunto/corpo de e-mail).
 */
function createTranslator(dictionaries: Dictionaries) {
  return function t(
    locale: SupportedLocale,
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
    const template = dict[key] ?? dictionaries[DEFAULT_LOCALE]![key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  }
}

// Dicionários próprios do server, separados de `i18n/locales/` (texto de UI
// do client) — mesmas 8 línguas, mas carregados só no bundle do Nitro, sem
// inflar o payload do client com chave que ele nunca usa.
const ERROR_DICTIONARIES: Dictionaries = {
  'pt-BR': errorsPtBR,
  en: errorsEn,
  es: errorsEs,
  fr: errorsFr,
  de: errorsDe,
  it: errorsIt,
  ja: errorsJa,
  ko: errorsKo,
}

const EMAIL_DICTIONARIES: Dictionaries = {
  'pt-BR': emailsPtBR,
  en: emailsEn,
  es: emailsEs,
  fr: emailsFr,
  de: emailsDe,
  it: emailsIt,
  ja: emailsJa,
  ko: emailsKo,
}

/** Traduz uma mensagem de erro de servidor pra virar `statusMessage`. */
export const translateError = createTranslator(ERROR_DICTIONARIES)

/** Traduz assunto/corpo de um template de e-mail transacional. */
export const translateEmail = createTranslator(EMAIL_DICTIONARIES)

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
