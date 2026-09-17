export function toTxt(text: string): string {
  return `${text.trim()}\n`
}

/** Nome de arquivo seguro a partir do título do vídeo. */
export function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim()
  return cleaned.length ? cleaned.replace(/\s+/g, '-') : 'transcricao'
}
