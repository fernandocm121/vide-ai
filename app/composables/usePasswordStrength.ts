export interface PasswordCriterion {
  key: string
  label: string
  met: boolean
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong'

/**
 * Mesmos critérios usados no servidor (`server/utils/validation.ts`) — só
 * pra feedback visual em tempo real, a validação de verdade continua na API.
 */
export function usePasswordStrength(password: Ref<string>) {
  const criteria = computed<PasswordCriterion[]>(() => [
    {
      key: 'length',
      label: 'Mínimo de 8 caracteres',
      met: password.value.length >= 8,
    },
    {
      key: 'lower',
      label: 'Uma letra minúscula',
      met: /[a-z]/.test(password.value),
    },
    {
      key: 'upper',
      label: 'Uma letra maiúscula',
      met: /[A-Z]/.test(password.value),
    },
    { key: 'number', label: 'Um número', met: /[0-9]/.test(password.value) },
    {
      key: 'special',
      label: 'Um caractere especial (@, #, $...)',
      met: /[^A-Za-z0-9]/.test(password.value),
    },
  ])

  const score = computed(() => criteria.value.filter((c) => c.met).length)

  const level = computed<PasswordStrengthLevel>(() => {
    if (password.value.length === 0) return 'empty'
    if (score.value <= 2) return 'weak'
    if (score.value <= 4) return 'medium'
    return 'strong'
  })

  const isValid = computed(() => score.value === criteria.value.length)

  return { criteria, score, level, isValid }
}
