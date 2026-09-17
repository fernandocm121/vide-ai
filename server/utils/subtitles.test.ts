import { describe, expect, it } from 'vitest'
import { sanitizeFilename, toTxt } from './subtitles'

describe('toTxt', () => {
  it('remove espaços nas pontas e garante quebra de linha final', () => {
    expect(toTxt('  olá mundo  ')).toBe('olá mundo\n')
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
