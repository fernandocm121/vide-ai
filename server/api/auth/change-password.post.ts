import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  currentPassword: z.string().min(1, 'obrigatório'),
  newPassword: passwordSchema,
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

  // compara contra o hash salvo (não a string `currentPassword` recebida) —
  // é a forma correta de saber se a "nova" senha é igual à que já está lá.
  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A nova senha deve ser diferente da senha atual',
    })
  }

  const db = useDrizzle()
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id))

  return { ok: true }
})
