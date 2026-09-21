import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  token: z.string().min(1),
  password: passwordSchema,
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
    })
  }

  const row = await consumeVerificationToken(
    parsed.data.token,
    'password_reset',
  )
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'auth.resetLinkInvalid'),
    })
  }

  const db = useDrizzle()
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(users.id, row.userId))

  // invalida todas as sessões existentes — quem tinha a senha antiga não
  // deveria continuar logado depois de uma redefinição.
  await destroyAllUserSessions(row.userId)
  await createSession(event, row.userId, { remember: true })

  return { ok: true }
})
