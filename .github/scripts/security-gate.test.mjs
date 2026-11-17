import { describe, expect, it } from 'vitest'
import { evaluate, renderSummary } from './security-gate.mjs'

const high = {
  file: 'server/api/x.ts',
  line: 3,
  severity: 'HIGH',
  category: 'idor',
  description: 'd',
}
const medium = {
  file: 'server/api/y.ts',
  line: 9,
  severity: 'MEDIUM',
  category: 'xss',
  description: 'd',
}

describe('evaluate — modo enforce', () => {
  const mode = 'enforce'

  it('aprova quando não há achados', () => {
    const out = evaluate({ mode, ran: true, results: { findings: [] } })
    expect(out.status).toBe('pass')
  })

  it('aprova com achados abaixo de HIGH, mas os lista', () => {
    const out = evaluate({ mode, ran: true, results: { findings: [medium] } })
    expect(out.status).toBe('pass')
    expect(out.findings).toHaveLength(1)
    expect(out.blocking).toHaveLength(0)
  })

  it('reprova com achado HIGH (case-insensitive)', () => {
    const out = evaluate({
      mode,
      ran: true,
      results: { findings: [medium, { ...high, severity: 'high' }] },
    })
    expect(out.status).toBe('fail')
    expect(out.blocking).toHaveLength(1)
  })

  it('reprova quando a revisão não rodou (fail-closed)', () => {
    expect(
      evaluate({ mode, ran: false, skipReason: 'fork', results: null }).status,
    ).toBe('fail')
    expect(
      evaluate({ mode, ran: false, skipReason: 'no-key', results: null })
        .status,
    ).toBe('fail')
  })

  it('reprova quando a revisão deu erro ou não gerou resultado', () => {
    expect(evaluate({ mode, ran: true, results: null }).status).toBe('fail')
    expect(
      evaluate({ mode, ran: true, results: { error: 'timeout' } }).status,
    ).toBe('fail')
    expect(
      evaluate({ mode, ran: true, results: { findings: 'x' } }).status,
    ).toBe('fail')
  })
})

describe('evaluate — modo advisory', () => {
  it('é o padrão para valores ausentes ou desconhecidos', () => {
    expect(evaluate({ ran: true, results: { findings: [] } }).mode).toBe(
      'advisory',
    )
    expect(
      evaluate({ mode: 'ENFORCE', ran: true, results: { findings: [] } }).mode,
    ).toBe('advisory')
  })

  it('nunca reprova: HIGH e falhas viram aviso', () => {
    expect(evaluate({ ran: true, results: { findings: [high] } }).status).toBe(
      'warn',
    )
    expect(
      evaluate({ ran: false, skipReason: 'no-key', results: null }).status,
    ).toBe('warn')
    expect(evaluate({ ran: true, results: { error: 'boom' } }).status).toBe(
      'warn',
    )
  })
})

describe('renderSummary', () => {
  it('escapa pipes e quebras de linha na tabela', () => {
    const out = evaluate({
      ran: true,
      results: { findings: [{ ...medium, description: 'a | b\nc' }] },
    })
    const md = renderSummary(out)
    expect(md).toContain('a \\| b c')
    expect(md).toContain('`server/api/y.ts:9`')
  })
})
