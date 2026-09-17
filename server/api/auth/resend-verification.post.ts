/** Reenvia o e-mail de confirmação para o usuário logado. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true }
  }

  const token = await createVerificationToken(user.id, 'email_verify')
  await sendMail({
    to: user.email,
    subject: 'Confirme seu e-mail — Vide AI',
    text: `Confirme seu e-mail para ativar sua conta:\n${verifyEmailUrl(token)}\n\nO link expira em 24 horas.`,
  })

  return {
    ok: true,
    devVerifyUrl: import.meta.dev ? verifyEmailUrl(token) : undefined,
  }
})
