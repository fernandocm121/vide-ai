/**
 * Idiomas oferecidos no seletor manual da transcrição. O Scribe v2 aceita
 * 90+ códigos (ISO-639-1 ou ISO-639-3) via `language_code`, mas expor todos
 * num dropdown não ajuda ninguém — esta lista é curadoria de produto,
 * começando pelo público-alvo do Vide AI. Código em ISO-639-1, o mesmo
 * formato já usado em `videos.language`/`transcripts.language`.
 */
export const TRANSCRIPTION_LANGUAGES: Record<string, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
}

// não pode ser '': o Dropdown do PrimeVue trata modelValue vazio como "sem
// seleção" (ObjectUtils.isNotEmpty) e cai pro placeholder em vez de exibir
// o label da opção selecionada, mesmo com uma opção de valor '' na lista
// (confirmado renderizando a página — o texto "Detecção automática" nunca
// aparecia). 'auto' nunca colide com um código ISO-639-1/639-3 real.
export const AUTO_DETECT_LANGUAGE = 'auto'

export interface LanguageOption {
  code: string
  label: string
}

/** Opções prontas para o Dropdown do PrimeVue — "Detecção automática" primeiro. */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: AUTO_DETECT_LANGUAGE, label: 'Detecção automática' },
  ...Object.entries(TRANSCRIPTION_LANGUAGES).map(([code, label]) => ({
    code,
    label,
  })),
]
