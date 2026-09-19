/** Um bloco de legenda: intervalo + texto (com as quebras de linha do bloco). */
export interface SrtCue {
  startMs: number
  endMs: number
  text: string
}

const TIMECODE =
  /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/

function toMs(h: string, m: string, s: string, ms: string): number {
  return (
    Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + Number(ms)
  )
}

/**
 * Lê o SRT que a ElevenLabs devolve e transforma em blocos estruturados.
 *
 * O SRT deles já vem com os cortes certos (respeita duração máxima, limite de
 * caracteres e silêncio entre falas), mas o export do Vide AI acontece muito
 * depois da transcrição, a partir do banco — então guardamos os blocos e
 * regeramos SRT e VTT a partir deles. Assim os dois formatos saem sempre com
 * os mesmos cortes.
 *
 * Tolerante de propósito: aceita CRLF, número de bloco ausente e blocos
 * malformados (que são ignorados em vez de derrubar a transcrição).
 */
export function parseSrtCues(srt: string): SrtCue[] {
  const cues: SrtCue[] = []

  for (const block of srt
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)) {
    const lines = block.split('\n')

    // o número do bloco é opcional; o que importa é achar o timecode
    const timecodeAt = lines.findIndex((l) => TIMECODE.test(l))
    if (timecodeAt === -1) continue

    const match = TIMECODE.exec(lines[timecodeAt]!)!
    const text = lines
      .slice(timecodeAt + 1)
      .join('\n')
      .trim()
    if (!text) continue

    cues.push({
      startMs: toMs(match[1]!, match[2]!, match[3]!, match[4]!),
      endMs: toMs(match[5]!, match[6]!, match[7]!, match[8]!),
      text,
    })
  }

  return cues
}
