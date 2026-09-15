/**
 * Envio de e-mail transacional.
 *
 * Ainda não há provedor configurado (Resend/SES/etc — fica para quando o
 * produto sair do estágio local). Por ora só registra no log do servidor,
 * igual ao padrão do PostHog sem chave: sem quebrar o fluxo, só sem enviar
 * de verdade. Em dev isso é suficiente para copiar o link e testar.
 */
export async function sendMail(opts: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  console.log(
    `\n[mail] para: ${opts.to}\n[mail] assunto: ${opts.subject}\n${opts.text}\n`,
  )
}

export function verifyEmailUrl(token: string): string {
  const { public: pub } = useRuntimeConfig()
  return `${pub.siteUrl.replace(/\/$/, '')}/verificar-email?token=${token}`
}

export function resetPasswordUrl(token: string): string {
  const { public: pub } = useRuntimeConfig()
  return `${pub.siteUrl.replace(/\/$/, '')}/redefinir-senha?token=${token}`
}
