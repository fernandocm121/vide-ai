import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  name: z.string().min(1, 'obrigatório').max(120),
  email: z.string().email('e-mail inválido').toLowerCase(),
  password: passwordSchema,
})

/**
 * Cria a conta (plano `free` por padrão, via default da coluna), loga o
 * usuário e dispara o e-mail de confirmação. A conta fica utilizável de
 * imediato — a verificação de e-mail não bloqueia o acesso, só aparece como
 * pendência no dashboard até ser confirmada.
 */
export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos',
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
      statusMessage: 'Já existe uma conta com este e-mail',
    })
  }

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning()

  // A conta já existe a partir daqui — gerar/enviar o e-mail de verificação
  // é um efeito colateral não crítico (a verificação não bloqueia o acesso).
  // Uma falha aqui não pode derrubar um cadastro que já foi salvo no banco.
  let devVerifyUrl: string | undefined
  try {
    const token = await createVerificationToken(user!.id, 'email_verify')
    await sendMail({
      to: user!.email,
      subject: 'Confirme seu e-mail — Vide AI',
      text: `Olá${name ? `, ${name}` : ''}! Confirme seu e-mail para ativar sua conta:\n${verifyEmailUrl(token)}\n\nO link expira em 24 horas.`,
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
