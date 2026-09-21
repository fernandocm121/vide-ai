import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { SUPPORTED_LOCALES } from '../../../shared/locales'
import { users } from '../../db/schema'

const Body = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
})

/** Salva o idioma de interface escolhido pelo usuário logado (sincroniza entre dispositivos). */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: translateError(
        getRequestLocale(event),
        'validation.invalidLocale',
      ),
    })
  }

  const db = useDrizzle()
  await db
    .update(users)
    .set({ preferredLocale: parsed.data.locale })
    .where(eq(users.id, user.id))

  return { ok: true }
})
