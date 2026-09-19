import type { TranscriptionSegment, TranscriptionWord } from './provider'

/** Segundos (como a API devolve) para milissegundos inteiros (como o banco guarda). */
export function toMs(seconds: number): number {
  return Math.round(seconds * 1000)
}

/**
 * `idx` do segmento que contém `ms`. Os segmentos precisam estar ordenados por
 * `startMs` (é como a API devolve). Quando `ms` cai num vazio entre dois
 * segmentos — ou antes do primeiro / depois do último — devolve o segmento
 * mais próximo no tempo, nunca `null`: uma palavra transcrita sempre veio de
 * algum trecho falado.
 */
function segmentIdxAt(ms: number, segments: TranscriptionSegment[]): number {
  let lo = 0
  let hi = segments.length - 1
  let candidate = -1

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid]!.startMs <= ms) {
      candidate = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  // antes do primeiro segmento
  if (candidate === -1) return segments[0]!.idx

  const current = segments[candidate]!
  if (ms <= current.endMs) return current.idx

  const next = segments[candidate + 1]
  if (next && next.startMs - ms < ms - current.endMs) return next.idx

  return current.idx
}

/**
 * Associa cada palavra ao segmento correspondente pelo ponto médio do seu
 * intervalo — as palavras e os quadros de legenda vêm em listas separadas, sem
 * nenhuma chave ligando as duas. O ponto médio (e não o início) porque uma
 * palavra pode começar no fim de um quadro e terminar no seguinte.
 *
 * Sem segmentos (a API não devolveu o `segmented_json`), todas as palavras
 * ficam com `segmentIdx: null`.
 */
export function assignWordsToSegments(
  words: Omit<TranscriptionWord, 'segmentIdx'>[],
  segments: TranscriptionSegment[],
): TranscriptionWord[] {
  if (!segments.length) {
    return words.map((w) => ({ ...w, segmentIdx: null }))
  }

  return words.map((w) => ({
    ...w,
    segmentIdx: segmentIdxAt((w.startMs + w.endMs) / 2, segments),
  }))
}
