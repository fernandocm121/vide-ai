/**
 * Formatos de upload aceitos — mapeia `contentType` (MIME) para extensão de
 * armazenamento + `mediaKind`. Espelhado no cliente em
 * `app/components/app/MediaUploader.vue` (o comentário lá aponta pra cá).
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
}

/**
 * M4A e AAC não têm garantia de compatibilidade direta com o gpt-transcribe:
 * a documentação da OpenAI lista `m4a` como formato aceito, mas isso
 * pressupõe áudio AAC dentro do container — alguns `.m4a` (sobretudo de apps
 * da Apple) usam ALAC (lossless), que não é o mesmo codec. `.aac` puro
 * (stream ADTS) nem aparece na lista de formatos documentados. Em vez de
 * arriscar um 400 da OpenAI depois que o upload já teve sucesso, esses dois
 * passam pelo mesmo ffmpeg que já normaliza o áudio de vídeos (`extractAudio`
 * em `server/transcription/ffmpeg.ts`) antes de transcrever — sempre mp3,
 * sempre aceito, independente do codec/variante de origem.
 */
export const NEEDS_FFMPEG_NORMALIZATION = new Set([
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
])
