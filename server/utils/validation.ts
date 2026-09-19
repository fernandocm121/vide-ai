import { z } from 'zod'

/**
 * Regra de senha usada em todo lugar que cria/troca senha (signup, reset,
 * troca de senha) — mesmo padrão do mercado: tamanho + maiúscula + minúscula
 * + número + caractere especial. As mensagens aparecem uma de cada vez (a
 * primeira regra não atendida), então a ordem aqui é a ordem que o usuário
 * vê os erros.
 */
export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter no mínimo 8 caracteres')
  .max(200)
  .regex(/[a-z]/, 'A senha precisa de pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'A senha precisa de pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'A senha precisa de pelo menos um número')
  .regex(
    /[^A-Za-z0-9]/,
    'A senha precisa de pelo menos um caractere especial (ex.: @, #, $, %)',
  )
