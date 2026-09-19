/**
 * Formatos de upload aceitos — mapeia `contentType` (MIME) para extensão de
 * armazenamento + `mediaKind`. Espelhado no cliente em
 * `app/components/app/MediaUploader.vue` (o comentário lá aponta pra cá).
 *
 * M4A e AAC entram como `audio` e vão direto pro ElevenLabs Scribe v2, sem
 * passar por ffmpeg — a API aceita os dois nativamente (confirmado contra a
 * API real, não só pela doc; ver `server/transcription/provider.test.ts`).
 * Cada formato tem mais de uma variante de MIME porque navegador/SO
 * preenchem `file.type` de forma diferente pro mesmo arquivo — mesmo padrão
 * já usado pro WAV (3 variantes) desde antes.
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
