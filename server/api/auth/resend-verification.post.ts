/** Reenvia o e-mail de confirmação para o usuário logado. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true }
  }

  const token = await createVerificationToken(user.id, 'email_verify')
  await sendVerifyEmail({
    to: user.email,
    // idioma da requisição atual (ver forgot-password.post.ts pro porquê de
    // não usar `user.preferredLocale` aqui: o valor salvo na conta fica
    // desatualizado com facilidade e o usuário está com a tela aberta agora).
    locale: getRequestLocale(event),
    token,
  })

  return {
    ok: true,
    devVerifyUrl: import.meta.dev ? verifyEmailUrl(token) : undefined,
  }
})
