import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  email: z.string().email('validation.invalidEmail').toLowerCase(),
})

export default defineEventHandler(async (event) => {
  const locale = getRequestLocale(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'validation.invalidEmail'),
    })
  }

  const db = useDrizzle()
  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: translateError(locale, 'auth.emailNotFound'),
    })
  }

  let devResetUrl: string | undefined
  try {
    const token = await createVerificationToken(user.id, 'password_reset')
    await sendPasswordResetEmail({
      to: user.email,
      // idioma da requisição atual, não o salvo na conta: quem pede reset de
      // senha está com o site aberto na tela agora, naquele idioma — usar o
      // `preferredLocale` da conta manda o e-mail errado sempre que ele
      // estiver desatualizado (ex.: usuário nunca trocou de idioma logado).
      locale,
      token,
    })
    devResetUrl = import.meta.dev ? resetPasswordUrl(token) : undefined
  } catch (err) {
    console.error('[forgot-password] falha ao enviar e-mail:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível enviar o e-mail. Tente de novo.',
    })
  }

  return { ok: true, devResetUrl }
})
