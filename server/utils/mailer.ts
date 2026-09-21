import { createTransport, type Transporter } from 'nodemailer'
import { Resend } from 'resend'
import type { SupportedLocale } from '../../shared/locales'

/**
 * Envio de e-mail transacional. Tenta, nessa ordem:
 *
 * 1. SMTP (ex.: Gmail + senha de app) — se `SMTP_USER`/`SMTP_PASS` estiverem
 *    configurados. Entrega pra qualquer destinatário sem precisar de
 *    domínio verificado; bom pra sair do "só loga no console" rápido.
 * 2. Resend — se `RESEND_API_KEY` estiver configurada. Sem domínio próprio
 *    verificado em resend.com/domains, só entrega pro e-mail dono da conta.
 * 3. Nenhum dos dois configurado: só registra no log do servidor — mesmo
 *    padrão do PostHog sem chave, nada quebra, só não envia de verdade.
 */
let smtpTransport: Transporter | null = null
let resendClient: Resend | null = null

function getSmtpTransport(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = useEnv()
  if (!SMTP_USER || !SMTP_PASS) return null
  if (!smtpTransport) {
    smtpTransport = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return smtpTransport
}

function getResendClient(): Resend | null {
  const { RESEND_API_KEY } = useEnv()
  if (!RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY)
  return resendClient
}

export async function sendMail(opts: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const smtp = getSmtpTransport()
  if (smtp) {
    const { SMTP_USER } = useEnv()
    try {
      await smtp.sendMail({
        from: `Vide AI <${SMTP_USER}>`,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      })
    } catch (err) {
      console.error('[mail] falha ao enviar via SMTP:', err)
      throw new Error('Falha ao enviar e-mail', { cause: err })
    }
    return
  }

  const resend = getResendClient()
  if (resend) {
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
    return
  }

  console.log(
    `\n[mail] (sem provedor configurado — só logando, e-mail não foi enviado de verdade)\n[mail] para: ${opts.to}\n[mail] assunto: ${opts.subject}\n${opts.text}\n`,
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

/**
 * E-mail de confirmação de conta, no idioma do destinatário. Assunto/corpo
 * vêm de `server/i18n/emails/*.json` (`translateEmail`); só o texto fixo do
 * template é traduzido — `name`, quando existir, entra como veio (não é
 * traduzido, é dado do usuário).
 *
 * Disparado em dois fluxos com textos hoje ligeiramente diferentes (mantidos
 * de propósito): signup sempre tem saudação ("Olá[, nome]!"), reenvio não.
 */
export async function sendVerifyEmail(opts: {
  to: string
  name?: string | null
  locale: SupportedLocale
  token: string
  greeting?: boolean
}): Promise<void> {
  const { greeting = false } = opts
  const prefix = !greeting
    ? ''
    : opts.name
      ? translateEmail(opts.locale, 'emailVerify.greetingWithName', {
          name: opts.name,
        })
      : translateEmail(opts.locale, 'emailVerify.greetingNoName')

  await sendMail({
    to: opts.to,
    subject: translateEmail(opts.locale, 'emailVerify.subject'),
    text:
      prefix +
      translateEmail(opts.locale, 'emailVerify.body', {
        url: verifyEmailUrl(opts.token),
      }),
  })
}

/** E-mail de redefinição de senha, no idioma do destinatário. */
export async function sendPasswordResetEmail(opts: {
  to: string
  locale: SupportedLocale
  token: string
}): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: translateEmail(opts.locale, 'passwordReset.subject'),
    text: translateEmail(opts.locale, 'passwordReset.body', {
      url: resetPasswordUrl(opts.token),
    }),
  })
}
