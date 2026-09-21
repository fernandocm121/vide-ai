import { z } from 'zod'

/**
 * Regra de senha usada em todo lugar que cria/troca senha (signup, reset,
 * troca de senha) — mesmo padrão do mercado: tamanho + maiúscula + minúscula
 * + número + caractere especial. As mensagens aparecem uma de cada vez (a
 * primeira regra não atendida), então a ordem aqui é a ordem que o usuário
 * vê os erros.
 *
 * As strings passadas pro Zod são chaves de `server/i18n/errors/*.json`, não
 * texto — o handler resolve com `translateError(locale, issue.message)`
 * antes de montar o `statusMessage` (ver `server/utils/i18n.ts`).
 */
export const passwordSchema = z
  .string()
  .min(8, 'validation.password.tooShort')
  .max(200)
  .regex(/[a-z]/, 'validation.password.needsLower')
  .regex(/[A-Z]/, 'validation.password.needsUpper')
  .regex(/[0-9]/, 'validation.password.needsNumber')
  .regex(/[^A-Za-z0-9]/, 'validation.password.needsSpecial')
