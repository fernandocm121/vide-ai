import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'mínimo de 8 caracteres').max(200),
})

export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    })
  }

  const row = await consumeVerificationToken(
    parsed.data.token,
    'password_reset',
  )
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Link inválido ou expirado. Peça uma nova redefinição.',
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
