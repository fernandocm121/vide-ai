import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const Body = z.object({ token: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const locale = getRequestLocale(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'auth.tokenMissing'),
    })
  }

  const row = await consumeVerificationToken(parsed.data.token, 'email_verify')
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(locale, 'auth.verifyLinkInvalid'),
    })
  }

  const db = useDrizzle()
  const [user] = await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, row.userId))
    .returning()

  // Se o link foi aberto num navegador sem sessão (ex.: outro dispositivo),
  // loga o usuário — ele já provou dono do e-mail ao abrir o link.
  const current = await getSessionUser(event)
  if (!current) {
    await createSession(event, row.userId, { remember: true })
  }

  return { user: toPublicUser(user!) }
})
