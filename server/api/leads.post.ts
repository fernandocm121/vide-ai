import { z } from 'zod'

const Body = z.object({
  email: z.string().email('e-mail inválido'),
  name: z.string().min(1).max(120).optional(),
  plan: z.enum(['starter', 'pro', 'agency']).nullish(),
})

/**
 * Captura de interesse da landing (formulário de /signup).
 *
 * A autenticação real (contas + sessões) é a próxima fase; por ora só
 * registramos o lead no log estruturado do servidor. Trocar por um insert
 * numa tabela `leads` / provedor de e-mail quando a fase de auth começar.
 */
export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? 'Dados inválidos',
      data: parsed.error.issues,
    })
  }

  const { email, name, plan } = parsed.data

  console.log(
    `[lead] ${email}${name ? ` (${name})` : ''}${plan ? ` — plano ${plan}` : ''}`,
  )

  setResponseStatus(event, 202)
  return { ok: true }
})
