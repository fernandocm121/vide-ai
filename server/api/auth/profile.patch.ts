import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({
  name: z.string().min(1, 'validation.required').max(120),
})

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
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

  const db = useDrizzle()
  const [updated] = await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, user.id))
    .returning()

  return { user: toPublicUser(updated!) }
})
