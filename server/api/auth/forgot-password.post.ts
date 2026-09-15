import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  email: z.string().email('e-mail inválido').toLowerCase(),
})

/** Sempre responde `ok` — não revela se o e-mail existe na base. */
export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail inválido' })
  }

  const db = useDrizzle()
  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })

  let devResetUrl: string | undefined
  if (user) {
    const token = await createVerificationToken(user.id, 'password_reset')
    await sendMail({
      to: user.email,
      subject: 'Redefinir senha — Vide AI',
      text: `Recebemos um pedido para redefinir sua senha:\n${resetPasswordUrl(token)}\n\nSe não foi você, ignore este e-mail. O link expira em 30 minutos.`,
    })
    devResetUrl = import.meta.dev ? resetPasswordUrl(token) : undefined
  }

  return { ok: true, devResetUrl }
})
