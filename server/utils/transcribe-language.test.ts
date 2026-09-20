import { describe, expect, it } from 'vitest'
import { TranscribeBody } from './transcribe-language'

describe('TranscribeBody', () => {
  it('aceita um código de idioma válido e normaliza pra minúsculo', () => {
    const parsed = TranscribeBody.safeParse({ language: 'PT' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.language).toBe('pt')
  })

  it('aceita código ISO-639-3 (3 letras)', () => {
    const parsed = TranscribeBody.safeParse({ language: 'por' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.language).toBe('por')
  })

  it('trata ausência do campo como detecção automática (undefined)', () => {
    const parsed = TranscribeBody.safeParse({})
    expect(parsed.success).toBe(true)
    expect(parsed.data?.language).toBeUndefined()
  })

  it('rejeita um corpo que não é um objeto (a rota normaliza `undefined` pra `{}` antes de validar)', () => {
    const parsed = TranscribeBody.safeParse(undefined)
    expect(parsed.success).toBe(false)
  })

  it('trata string vazia como detecção automática, sem perpetuar a chave', () => {
    const parsed = TranscribeBody.safeParse({ language: '' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.language).toBeUndefined()
  })

  it('trata string só com espaços como detecção automática', () => {
    const parsed = TranscribeBody.safeParse({ language: '   ' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.language).toBeUndefined()
  })

  it('rejeita um código com formato inválido', () => {
    const parsed = TranscribeBody.safeParse({ language: 'portuguese' })
    expect(parsed.success).toBe(false)
  })

  it('rejeita um valor que não é string', () => {
    const parsed = TranscribeBody.safeParse({ language: 42 })
    expect(parsed.success).toBe(false)
  })
})
