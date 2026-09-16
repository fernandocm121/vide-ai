import { Resend } from 'resend'

/**
 * Envio de e-mail transacional via Resend.
 *
 * Sem `RESEND_API_KEY` configurada, cai de volta a só registrar no log do
 * servidor — mesmo padrão do PostHog sem chave: nada quebra, só não envia
 * de verdade. Em dev isso já é suficiente pra copiar o link e testar; em
 * produção a chave é obrigatória pro fluxo de e-mail funcionar de fato.
 */
let client: Resend | null = null

function getClient(): Resend | null {
  const { RESEND_API_KEY } = useEnv()
  if (!RESEND_API_KEY) return null
  if (!client) client = new Resend(RESEND_API_KEY)
  return client
}

export async function sendMail(opts: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const resend = getClient()

  if (!resend) {
    console.log(
      `\n[mail] (RESEND_API_KEY ausente — só logando, e-mail não foi enviado de verdade)\n[mail] para: ${opts.to}\n[mail] assunto: ${opts.subject}\n${opts.text}\n`,
    )
    return
  }

  const { MAIL_FROM } = useEnv()
  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  })

  if (error) {
    console.error('[mail] falha ao enviar via Resend:', error)
    throw new Error(`Falha ao enviar e-mail: ${error.message}`)
  }
}

export function verifyEmailUrl(token: string): string {
  const { public: pub } = useRuntimeConfig()
  return `${pub.siteUrl.replace(/\/$/, '')}/verificar-email?token=${token}`
}

export function resetPasswordUrl(token: string): string {
  const { public: pub } = useRuntimeConfig()
  return `${pub.siteUrl.replace(/\/$/, '')}/redefinir-senha?token=${token}`
}
