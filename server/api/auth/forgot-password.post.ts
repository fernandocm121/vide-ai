import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  email: z.string().email('e-mail inválido').toLowerCase(),
})

export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail inválido' })
  }

  const db = useDrizzle()
  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Não existe uma conta com este e-mail',
    })
  }

  let devResetUrl: string | undefined
  try {
    const token = await createVerificationToken(user.id, 'password_reset')
    await sendMail({
      to: user.email,
      subject: 'Redefinir senha — Vide AI',
      text: `Recebemos um pedido para redefinir sua senha:\n${resetPasswordUrl(token)}\n\nSe não foi você, ignore este e-mail. O link expira em 30 minutos.`,
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
