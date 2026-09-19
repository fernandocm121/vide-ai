/**
 * Formatos de upload aceitos — mapeia `contentType` (MIME) para extensão de
 * armazenamento + `mediaKind`. Espelhado no cliente em
 * `app/components/app/MediaUploader.vue` (o comentário lá aponta pra cá).
 *
 * M4A e AAC vão direto para o Scribe v2 com o `mimeType` original, sem
 * passar por ffmpeg antes — a ElevenLabs aceita os dois nativamente
 * (confirmado contra a API real, não só pela documentação). Cada formato
 * pode ter mais de uma variante de MIME (o navegador/SO reporta de forma
 * diferente dependendo do codec/container), igual já acontecia com o WAV.
 */
export const ACCEPTED_MEDIA_TYPES: Record<
  string,
  { ext: string; kind: 'audio' | 'video' }
> = {
  'video/mp4': { ext: 'mp4', kind: 'video' },
  'video/quicktime': { ext: 'mov', kind: 'video' },
  'video/webm': { ext: 'webm', kind: 'video' },
  'audio/mpeg': { ext: 'mp3', kind: 'audio' },
  'audio/wav': { ext: 'wav', kind: 'audio' },
  'audio/x-wav': { ext: 'wav', kind: 'audio' },
  'audio/wave': { ext: 'wav', kind: 'audio' },
  'audio/mp4': { ext: 'm4a', kind: 'audio' },
  'audio/x-m4a': { ext: 'm4a', kind: 'audio' },
  'audio/aac': { ext: 'aac', kind: 'audio' },
  'audio/x-aac': { ext: 'aac', kind: 'audio' },
}
