/**
 * A ElevenLabs devolve o idioma detectado em ISO-639-3 (`por`, `eng`),
 * enquanto `videos.language` e `transcripts.language` guardam ISO-639-1
 * (`pt`, `en`) — que é o que a UI e a dica de idioma do upload usam.
 * Normalizar aqui, na borda do provider, evita que `por` vaze para o banco.
 */
const ISO_639_3_TO_1: Record<string, string> = {
  ara: 'ar',
  ces: 'cs',
  cmn: 'zh',
  dan: 'da',
  deu: 'de',
  ell: 'el',
  eng: 'en',
  fin: 'fi',
  fra: 'fr',
  heb: 'he',
  hin: 'hi',
  hun: 'hu',
  ind: 'id',
  ita: 'it',
  jpn: 'ja',
  kor: 'ko',
  nld: 'nl',
  nor: 'no',
  pol: 'pl',
  por: 'pt',
  ron: 'ro',
  rus: 'ru',
  spa: 'es',
  swe: 'sv',
  tha: 'th',
  tur: 'tr',
  ukr: 'uk',
  vie: 'vi',
  zho: 'zh',
}

/**
 * Converte o código de idioma para ISO-639-1. Aceita código com região
 * (`pt-BR` -> `pt`). Código de três letras fora do mapa é devolvido como
 * veio: perder a informação seria pior, e a API da ElevenLabs aceita as duas
 * formas quando mandamos de volta como dica de idioma.
 */
export function toIso6391(code: string | null | undefined): string | null {
  if (!code) return null

  const base = code.trim().toLowerCase().split(/[-_]/)[0]
  if (!base) return null
  if (base.length === 2) return base

  return ISO_639_3_TO_1[base] ?? base
}
