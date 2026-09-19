import { describe, expect, it } from 'vitest'
import { toIso6391 } from './language'

describe('toIso6391', () => {
  it('converte o ISO-639-3 da ElevenLabs para ISO-639-1', () => {
    expect(toIso6391('por')).toBe('pt')
    expect(toIso6391('eng')).toBe('en')
    expect(toIso6391('spa')).toBe('es')
  })

  it('mantém código que já está em ISO-639-1', () => {
    expect(toIso6391('pt')).toBe('pt')
  })

  it('descarta a região', () => {
    expect(toIso6391('pt-BR')).toBe('pt')
    expect(toIso6391('POR_BR')).toBe('pt')
  })

  it('devolve o código original quando não conhece o idioma', () => {
    expect(toIso6391('xyz')).toBe('xyz')
  })

  it('devolve null para ausente ou vazio', () => {
    expect(toIso6391(null)).toBeNull()
    expect(toIso6391(undefined)).toBeNull()
    expect(toIso6391('   ')).toBeNull()
  })
})
