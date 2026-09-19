import { describe, expect, it } from 'vitest'
import { parseSrtCues } from './srt'

// saída real do Scribe v2 para um áudio de 10s
const SRT = [
  '1',
  '00:00:00,160 --> 00:00:03,680',
  'Olá pessoal,',
  'bem-vindos a mais um episódio.',
  '',
  '2',
  '00:00:04,740 --> 00:00:08,560',
  'Hoje vamos falar sobre timestamps',
  '',
  '3',
  '00:01:02,680 --> 01:00:09,540',
  'por palavra',
  '',
].join('\n')

describe('parseSrtCues', () => {
  it('lê intervalos e texto, mantendo a quebra de linha do bloco', () => {
    const cues = parseSrtCues(SRT)

    expect(cues).toHaveLength(3)
    expect(cues[0]).toEqual({
      startMs: 160,
      endMs: 3680,
      text: 'Olá pessoal,\nbem-vindos a mais um episódio.',
    })
  })

  it('converte horas e minutos corretamente', () => {
    const cues = parseSrtCues(SRT)

    expect(cues[2]!.startMs).toBe(62_680)
    expect(cues[2]!.endMs).toBe(3_609_540)
  })

  it('aceita CRLF', () => {
    const cues = parseSrtCues(SRT.replace(/\n/g, '\r\n'))

    expect(cues[0]!.text).toBe('Olá pessoal,\nbem-vindos a mais um episódio.')
  })

  it('aceita bloco sem número e ponto no lugar da vírgula', () => {
    const cues = parseSrtCues('00:00:01.000 --> 00:00:02.500\nolá')

    expect(cues).toEqual([{ startMs: 1000, endMs: 2500, text: 'olá' }])
  })

  it('ignora bloco sem timecode ou sem texto', () => {
    const cues = parseSrtCues(
      '1\nlixo sem timecode\n\n2\n00:00:01,000 --> 00:00:02,000\n\n\n3\n00:00:03,000 --> 00:00:04,000\nvale',
    )

    expect(cues).toEqual([{ startMs: 3000, endMs: 4000, text: 'vale' }])
  })

  it('devolve lista vazia para conteúdo vazio ou inválido', () => {
    expect(parseSrtCues('')).toEqual([])
    expect(parseSrtCues('   ')).toEqual([])
    expect(parseSrtCues('isso não é um srt')).toEqual([])
  })
})
