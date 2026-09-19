interface ExportSegment {
  startMs: number
  endMs: number
  text: string
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** ms -> "HH:MM:SS,mmm" (SRT) */
function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const rest = ms % 1000
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(rest, 3)}`
}

/** ms -> "HH:MM:SS.mmm" (WebVTT) */
function msToVttTime(ms: number): string {
  return msToSrtTime(ms).replace(',', '.')
}

export function toTxt(text: string): string {
  return `${text.trim()}\n`
}

export function toSrt(segments: ExportSegment[]): string {
  return (
    segments
      .map(
        (s, i) =>
          `${i + 1}\n${msToSrtTime(s.startMs)} --> ${msToSrtTime(s.endMs)}\n${s.text.trim()}\n`,
      )
      .join('\n') + '\n'
  )
}

export function toVtt(segments: ExportSegment[]): string {
  const body = segments
    .map(
      (s) =>
        `${msToVttTime(s.startMs)} --> ${msToVttTime(s.endMs)}\n${s.text.trim()}\n`,
    )
    .join('\n')
  return `WEBVTT\n\n${body}`
}

/** Nome de arquivo seguro a partir do título do vídeo. */
export function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim()
  return cleaned.length ? cleaned.replace(/\s+/g, '-') : 'transcricao'
}
