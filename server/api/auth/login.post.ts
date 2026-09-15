import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  email: z.string().email('e-mail inválido').toLowerCase(),
  password: z.string().min(1, 'obrigatório'),
  remember: z.boolean().optional(),
})

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos'

export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos',
      data: parsed.error.issues,
    })
  }
  const { email, password, remember } = parsed.data

  const db = useDrizzle()
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (
    !user?.passwordHash ||
    !(await verifyPassword(user.passwordHash, password))
  ) {
    throw createError({ statusCode: 401, statusMessage: INVALID_CREDENTIALS })
  }

  await createSession(event, user.id, { remember })

  return { user: toPublicUser(user) }
})
