interface ApiErrorLike {
  status?: number
  data?: { statusMessage?: string }
}

/**
 * Extrai uma mensagem de erro segura pra mostrar ao usuário a partir de um
 * erro de `$fetch`. Só confia no `statusMessage` do servidor para erros
 * esperados (4xx — sempre vêm com texto em português explicando o problema,
 * ex.: "E-mail ou senha incorretos"); qualquer 5xx cai no `fallback` em vez
 * de expor "Server Error" ou detalhes internos.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorLike
  const statusMessage = e?.data?.statusMessage
  if (e?.status && e.status < 500 && statusMessage) {
    return statusMessage
  }
  return fallback
}
