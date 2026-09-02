import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { useDrizzle } from './drizzle'

/**
 * Usuário da requisição.
 *
 * TODO Fase 2 (autenticação): ler a sessão real do cookie.
 * Por enquanto retorna o usuário de dev criado pelo seed — todas as rotas
 * de `/app` operam como esse usuário.
 */
const DEV_EMAIL = 'dev@videai.local'

export async function getCurrentUser(_event: H3Event) {
  const db = useDrizzle()
  const user = await db.query.users.findFirst({
    where: eq(users.email, DEV_EMAIL),
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage:
        'Usuário de desenvolvimento não encontrado. Rode: npm run db:seed',
    })
  }

  return user
}
