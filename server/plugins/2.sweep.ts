import { sweepStaleTranscriptions } from '../transcription/sweep'

/**
 * No boot, recupera transcrições que ficaram presas por um restart.
 * Não bloqueia a inicialização e ignora erros (ex.: banco ainda subindo).
 */
export default defineNitroPlugin(() => {
  sweepStaleTranscriptions().catch((err) => {
    console.warn('[sweep] ignorado:', err instanceof Error ? err.message : err)
  })
})
