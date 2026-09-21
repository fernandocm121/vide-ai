import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  name: z.string().min(1, 'validation.required').max(120),
  email: z.string().email('validation.invalidEmail').toLowerCase(),
  password: passwordSchema,
})

/**
 * Cria a conta (plano `free` por padrão, via default da coluna), loga o
 * usuário e dispara o e-mail de confirmação. A conta fica utilizável de
 * imediato — a verificação de e-mail não bloqueia o acesso, só aparece como
 * pendência no dashboard até ser confirmada.
 */
export default defineEventHandler(async (event) => {
  const locale = getRequestLocale(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(
        locale,
        parsed.error.issues[0]?.message ?? 'validation.generic',
      ),
      data: parsed.error.issues,
    })
  }
  const { name, email, password } = parsed.data

  const db = useDrizzle()
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: translateError(locale, 'auth.emailTaken'),
    })
  }

  // Usuário ainda não tinha preferência de idioma salva — grava o locale
  // ativo no momento do cadastro (cookie do @nuxtjs/i18n, já resolvido acima
  // em `locale`) como ponto de partida; a UI deixa trocar depois.
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      preferredLocale: locale,
    })
    .returning()

  // A conta já existe a partir daqui — gerar/enviar o e-mail de verificação
  // é um efeito colateral não crítico (a verificação não bloqueia o acesso).
  // Uma falha aqui não pode derrubar um cadastro que já foi salvo no banco.
  let devVerifyUrl: string | undefined
  try {
    const token = await createVerificationToken(user!.id, 'email_verify')
    await sendVerifyEmail({
      to: user!.email,
      name,
      locale,
      token,
      greeting: true,
    })
    // sem provedor de e-mail real ainda: devolve o link também na resposta,
    // só em dev, pra dar pra testar o fluxo sem sair do navegador.
    devVerifyUrl = import.meta.dev ? verifyEmailUrl(token) : undefined
  } catch (err) {
    console.error(
      '[signup] falha ao gerar/enviar e-mail de verificação (cadastro segue normalmente):',
      err,
    )
  }

  await createSession(event, user!.id, { remember: true })

  setResponseStatus(event, 201)
  return { user: toPublicUser(user!), devVerifyUrl }
})
