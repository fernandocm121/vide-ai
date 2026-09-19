import { describe, expect, it } from 'vitest'
import { assignWordsToSegments, toMs } from './timestamps'
import type { TranscriptionSegment } from './provider'

const segments: TranscriptionSegment[] = [
  { idx: 0, startMs: 0, endMs: 4000, text: 'primeiro segmento' },
  { idx: 1, startMs: 4000, endMs: 9000, text: 'segundo segmento' },
  { idx: 2, startMs: 12_000, endMs: 15_000, text: 'terceiro segmento' },
]

function word(startMs: number, endMs: number, text = 'x') {
  return { idx: 0, startMs, endMs, text, logprob: -0.1 }
}

describe('toMs', () => {
  it('converte segundos em milissegundos inteiros', () => {
    expect(toMs(1.2345)).toBe(1235)
    expect(toMs(0)).toBe(0)
  })
})

describe('assignWordsToSegments', () => {
  it('associa cada palavra ao segmento que contém o seu ponto médio', () => {
    const words = assignWordsToSegments(
      [word(100, 900), word(4100, 4600), word(12_500, 13_000)],
      segments,
    )

    expect(words.map((w) => w.segmentIdx)).toEqual([0, 1, 2])
  })

  it('usa o ponto médio, não o início, quando a palavra cruza a fronteira', () => {
    // começa no segmento 0, mas a maior parte dela está no 1
    const [w] = assignWordsToSegments([word(3800, 4600)], segments)

    expect(w!.segmentIdx).toBe(1)
  })

  it('cola no segmento mais próximo quando a palavra cai num silêncio', () => {
    const words = assignWordsToSegments(
      [word(9200, 9400), word(11_500, 11_900)],
      segments,
    )

    expect(words.map((w) => w.segmentIdx)).toEqual([1, 2])
  })

  it('associa ao primeiro/último segmento o que está fora do intervalo coberto', () => {
    const words = assignWordsToSegments(
      [word(0, 0), word(20_000, 20_500)],
      segments,
    )

    expect(words.map((w) => w.segmentIdx)).toEqual([0, 2])
  })

  it('devolve segmentIdx nulo quando não há segmentos', () => {
    const words = assignWordsToSegments([word(100, 900), word(1000, 1500)], [])

    expect(words.map((w) => w.segmentIdx)).toEqual([null, null])
  })

  it('preserva idx, texto e logprob das palavras', () => {
    const words = assignWordsToSegments(
      [
        { idx: 0, startMs: 100, endMs: 900, text: 'olá', logprob: -0.05 },
        { idx: 1, startMs: 4100, endMs: 4600, text: 'mundo', logprob: -1.2 },
      ],
      segments,
    )

    expect(words).toEqual([
      {
        idx: 0,
        startMs: 100,
        endMs: 900,
        text: 'olá',
        logprob: -0.05,
        segmentIdx: 0,
      },
      {
        idx: 1,
        startMs: 4100,
        endMs: 4600,
        text: 'mundo',
        logprob: -1.2,
        segmentIdx: 1,
      },
    ])
  })

  it('devolve lista vazia quando não há palavras', () => {
    expect(assignWordsToSegments([], segments)).toEqual([])
  })
})
