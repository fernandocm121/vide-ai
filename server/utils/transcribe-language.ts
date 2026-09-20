import { z } from 'zod'

/**
 * Corpo aceito por POST /api/videos/:id/transcribe. `language` ausente,
 * vazio ou só espaço = detecção automática — nenhum `language_code` é
 * enviado ao Scribe v2 (ver `server/transcription/provider.ts`). Formato
 * solto de propósito: a curadoria de quais idiomas aparecem no seletor é
 * decisão de produto (`app/utils/languages.ts`), não uma restrição da API,
 * que aceita 90+ códigos ISO-639-1/639-3.
 */
export const TranscribeBody = z.object({
  language: z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined
      if (typeof value === 'string') return value.trim() || undefined
      return value // não é string nem nulo/ausente — deixa o z.string() rejeitar
    },
    z
      .string()
      .toLowerCase()
      .regex(
        /^[a-z]{2,3}$/,
        'Idioma inválido — use um código ISO-639-1 ou 639-3 (ex.: "pt").',
      )
      .optional(),
  ),
})

export type TranscribeBodyInput = z.infer<typeof TranscribeBody>
