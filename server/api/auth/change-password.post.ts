import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  currentPassword: z.string().min(1, 'obrigatório'),
  newPassword: z.string().min(8, 'mínimo de 8 caracteres').max(200),
})

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    })
  }
  const { currentPassword, newPassword } = parsed.data

  if (
    !user.passwordHash ||
    !(await verifyPassword(user.passwordHash, currentPassword))
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Senha atual incorreta',
    })
  }

  const db = useDrizzle()
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id))

  return { ok: true }
})
