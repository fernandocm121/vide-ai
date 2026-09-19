import { describe, expect, it } from 'vitest'
import { sanitizeFilename, toSrt, toTxt, toVtt } from './subtitles'

const segments = [
  { startMs: 0, endMs: 1500, text: ' olá mundo ' },
  { startMs: 1500, endMs: 3_723_456, text: 'tchau' },
]

describe('toTxt', () => {
  it('remove espaços nas pontas e garante quebra de linha final', () => {
    expect(toTxt('  olá mundo  ')).toBe('olá mundo\n')
  })
})

describe('toSrt', () => {
  it('numera as legendas e usa vírgula nos milissegundos', () => {
    expect(toSrt(segments)).toBe(
      [
        '1',
        '00:00:00,000 --> 00:00:01,500',
        'olá mundo',
        '',
        '2',
        '00:00:01,500 --> 01:02:03,456',
        'tchau',
        '',
        '',
      ].join('\n'),
    )
  })

  it('não quebra com lista vazia', () => {
    expect(toSrt([])).toBe('\n')
  })
})

describe('toVtt', () => {
  it('abre com WEBVTT e usa ponto nos milissegundos', () => {
    expect(toVtt(segments)).toBe(
      [
        'WEBVTT',
        '',
        '00:00:00.000 --> 00:00:01.500',
        'olá mundo',
        '',
        '00:00:01.500 --> 01:02:03.456',
        'tchau',
        '',
      ].join('\n'),
    )
  })

  it('usa exatamente os mesmos intervalos do SRT', () => {
    const srtTimes = toSrt(segments).match(/\d{2}:\d{2}:\d{2},\d{3}/g)!
    const vttTimes = toVtt(segments).match(/\d{2}:\d{2}:\d{2}\.\d{3}/g)

    expect(vttTimes).toEqual(srtTimes.map((t) => t.replace(',', '.')))
  })
})

describe('sanitizeFilename', () => {
  it('troca espaços por hífen e remove pontuação', () => {
    expect(sanitizeFilename('Reunião de Vendas: Q3!')).toBe(
      'Reunião-de-Vendas-Q3',
    )
  })

  it('usa um nome padrão quando o título fica vazio após sanitizar', () => {
    expect(sanitizeFilename('!!!')).toBe('transcricao')
  })
})
