export type VideoStatus =
  | 'uploading'
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'transcribing'
  | 'analyzing'
  | 'ready'
  | 'failed'

type StatusMeta = {
  label: string
  tone: 'neutral' | 'progress' | 'success' | 'error'
}

export const STATUS_META: Record<VideoStatus, StatusMeta> = {
  uploading: { label: 'Enviando', tone: 'neutral' },
  uploaded: { label: 'Aguardando confirmação', tone: 'neutral' },
  queued: { label: 'Na fila', tone: 'progress' },
  extracting: { label: 'Convertendo áudio', tone: 'progress' },
  transcribing: { label: 'Transcrevendo', tone: 'progress' },
  analyzing: { label: 'Analisando', tone: 'progress' },
  ready: { label: 'Pronto', tone: 'success' },
  failed: { label: 'Falhou', tone: 'error' },
}

export const IN_PROGRESS: VideoStatus[] = [
  'queued',
  'extracting',
  'transcribing',
  'analyzing',
]

/** segundos -> "12 min 03 s" (para durações) */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`
}

/** milissegundos -> "m:ss" (ou "h:mm:ss" acima de uma hora) — marcação de trecho no player */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}
