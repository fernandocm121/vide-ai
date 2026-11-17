// Decide se a revisão de segurança por IA aprova ou reprova a PR.
//
// A IA (anthropics/claude-code-action, com --json-schema) só produz o JSON de
// achados; quem decide é este script, de forma determinística:
//
// - modo `enforce`: reprova se houver achado HIGH, ou se a revisão não rodou /
//   deu erro (fail-closed: "não revisado" nunca vira "aprovado").
// - modo `advisory` (padrão): nunca reprova; só anota avisos na PR.
//
// Uso no workflow (variáveis de ambiente):
//   GATE_MODE      advisory | enforce   (vars.AI_SECURITY_GATE_MODE)
//   REVIEW_RAN     true | false         (a Action chegou a ser executada?)
//   SKIP_REASON    fork | no-key | ''   (por que não rodou)
//   RESULTS_PATH   caminho do JSON com { findings: [...] } (structured_output)

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Severidade que reprova a PR no modo `enforce`. */
export const BLOCKING_SEVERITY = 'HIGH'

const SKIP_MESSAGES = {
  fork:
    'PR vinda de fork: o GitHub não entrega secrets a forks, então a revisão ' +
    'por IA não rodou. Um mantenedor precisa revisar a segurança manualmente.',
  'no-key':
    'O secret CLAUDE_CODE_OAUTH_TOKEN não está configurado no repositório, ' +
    'então a revisão por IA não rodou (gere o token com `claude setup-token`).',
}

/**
 * @param {{
 *   mode?: string,
 *   ran: boolean,
 *   skipReason?: string,
 *   results: unknown,
 * }} input
 * @returns {{
 *   status: 'pass' | 'warn' | 'fail',
 *   mode: 'advisory' | 'enforce',
 *   message: string,
 *   findings: Array<Record<string, unknown>>,
 *   blocking: Array<Record<string, unknown>>,
 * }}
 */
export function evaluate({ mode, ran, skipReason, results }) {
  const gateMode = mode === 'enforce' ? 'enforce' : 'advisory'
  // Problema que impede afirmar que a PR foi revisada.
  const unreviewed = (message) => ({
    status: gateMode === 'enforce' ? 'fail' : 'warn',
    mode: gateMode,
    message,
    findings: [],
    blocking: [],
  })

  if (!ran) {
    return unreviewed(
      SKIP_MESSAGES[skipReason] ?? 'A revisão por IA não foi executada.',
    )
  }
  if (!results || typeof results !== 'object') {
    return unreviewed(
      'A revisão por IA não gerou resultado (arquivo ausente ou inválido).',
    )
  }
  if ('error' in results && results.error) {
    return unreviewed(`A revisão por IA falhou: ${String(results.error)}`)
  }
  if (!Array.isArray(results.findings)) {
    return unreviewed(
      'O resultado da revisão por IA não tem a lista `findings`.',
    )
  }

  const findings = results.findings.filter((f) => f && typeof f === 'object')
  const blocking = findings.filter(
    (f) => String(f.severity ?? '').toUpperCase() === BLOCKING_SEVERITY,
  )

  if (blocking.length > 0) {
    return {
      status: gateMode === 'enforce' ? 'fail' : 'warn',
      mode: gateMode,
      message: `${blocking.length} achado(s) de severidade ${BLOCKING_SEVERITY}.`,
      findings,
      blocking,
    }
  }
  return {
    status: 'pass',
    mode: gateMode,
    message:
      findings.length > 0
        ? `Nenhum achado ${BLOCKING_SEVERITY}; ${findings.length} achado(s) de menor severidade para avaliar.`
        : 'Nenhum achado de segurança.',
    findings,
    blocking,
  }
}

/** Escapa texto para comandos de workflow (`::warning ...::msg`). */
function escapeData(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C')
}

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

/** Markdown para o resumo do job (GITHUB_STEP_SUMMARY). */
export function renderSummary(outcome) {
  const icon = { pass: '✅', warn: '⚠️', fail: '❌' }[outcome.status]
  const lines = [
    `## ${icon} Revisão de segurança por IA`,
    '',
    `**Modo:** \`${outcome.mode}\` · **Resultado:** ${outcome.message}`,
    '',
  ]
  if (outcome.mode === 'advisory' && outcome.status !== 'pass') {
    lines.push(
      '> Modo consultivo: este check não bloqueia o merge. Para bloquear, ' +
        'defina a variável de repositório `AI_SECURITY_GATE_MODE=enforce`.',
      '',
    )
  }
  if (outcome.findings.length > 0) {
    lines.push(
      '| Severidade | Arquivo | Categoria | Confiança | Descrição |',
      '| --- | --- | --- | --- | --- |',
    )
    for (const f of outcome.findings) {
      const where = f.line ? `${f.file}:${f.line}` : f.file
      lines.push(
        `| ${cell(f.severity)} | \`${cell(where)}\` | ${cell(f.category)} | ${cell(f.confidence)} | ${cell(f.description)} |`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

function annotate(outcome) {
  const level = outcome.status === 'fail' ? 'error' : 'warning'
  for (const f of outcome.findings) {
    const isBlocking = outcome.blocking.includes(f)
    const props = [
      `title=${escapeProperty(`[${f.severity}] ${f.category ?? 'security'}`)}`,
    ]
    if (f.file) props.unshift(`file=${escapeProperty(f.file)}`)
    if (f.line) props.splice(1, 0, `line=${escapeProperty(f.line)}`)
    const body = [
      f.description,
      f.exploit_scenario && `Cenário: ${f.exploit_scenario}`,
      f.recommendation && `Correção: ${f.recommendation}`,
    ]
      .filter(Boolean)
      .join('\n')
    console.log(
      `::${isBlocking ? level : 'notice'} ${props.join(',')}::${escapeData(body)}`,
    )
  }
  if (outcome.status !== 'pass') {
    console.log(
      `::${level} title=Revisão de segurança por IA::${escapeData(outcome.message)}`,
    )
  }
}

function readResults(path) {
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function main() {
  const env = process.env
  const outcome = evaluate({
    mode: env.GATE_MODE,
    ran: env.REVIEW_RAN === 'true',
    skipReason: env.SKIP_REASON,
    results: readResults(env.RESULTS_PATH),
  })

  annotate(outcome)
  const summary = renderSummary(outcome)
  console.log(summary)
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, summary + '\n')

  process.exitCode = outcome.status === 'fail' ? 1 : 0
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
