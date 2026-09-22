/**
 * Idiomas de áudio oferecidos no seletor manual de transcrição — curadoria,
 * não é 1:1 com os 90+ que o Scribe v2 aceita (`language_code`, ISO-639-1 ou
 * ISO-639-3). Começa pelos idiomas que fazem sentido pro público do Vide AI;
 * acrescentar aqui quando fizer sentido pra novos mercados.
 *
 * `nameKey` reaproveita as traduções de nome de idioma que já existem em
 * `common.languageSwitcher.names` (i18n/locales/*.json) — mesmo texto que o
 * seletor de idioma da UI usa, sem duplicar 8×8 strings. Só `pt` difere do
 * código de locale da UI (`pt-BR`); os demais são o próprio código ISO-639-1.
 */
export interface TranscriptionLanguageOption {
  /** ISO-639-1 — vai direto pra `videos.language` e pro `language_code` da API. */
  code: string
  /** Chave dentro de `common.languageSwitcher.names` pra exibir o nome traduzido. */
  nameKey: string
}

/**
 * Sentinela do Dropdown pra "detecção automática" — não pode ser `''`: o
 * Dropdown do PrimeVue trata string vazia como "nada selecionado" e não
 * mostra o label da opção correspondente. Nunca é enviado pro server (ver
 * `MediaUploader.vue`/`videos/[id].vue`: quando `language === AUTO_DETECT`,
 * o corpo do POST simplesmente omite a chave `language`).
 */
export const AUTO_DETECT = 'auto'

export const TRANSCRIPTION_LANGUAGES: TranscriptionLanguageOption[] = [
  { code: 'pt', nameKey: 'pt-BR' },
  { code: 'en', nameKey: 'en' },
  { code: 'es', nameKey: 'es' },
  { code: 'fr', nameKey: 'fr' },
  { code: 'de', nameKey: 'de' },
  { code: 'it', nameKey: 'it' },
  { code: 'ja', nameKey: 'ja' },
  { code: 'ko', nameKey: 'ko' },
]
