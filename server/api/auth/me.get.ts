/** Usuário da sessão atual, ou `null` se ninguém estiver logado. Nunca lança 401. */
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  return user ? toPublicUser(user) : null
})
