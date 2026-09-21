import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  email: z.string().email('validation.invalidEmail').toLowerCase(),
  password: z.string().min(1, 'validation.required'),
  remember: z.boolean().optional(),
})

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
  const { email, password, remember } = parsed.data

  const db = useDrizzle()
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (
    !user?.passwordHash ||
    !(await verifyPassword(user.passwordHash, password))
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: translateError(locale, 'auth.invalidCredentials'),
    })
  }

  await createSession(event, user.id, { remember })

  return { user: toPublicUser(user) }
})
