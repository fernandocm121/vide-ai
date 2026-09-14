/**
 * Valida as variáveis de ambiente no boot do servidor.
 *
 * Em desenvolvimento: falha cedo e com mensagem clara se algo faltar.
 * Em produção: registra o problema mas deixa o boot seguir — assim a landing
 * (que não toca no banco) sobe mesmo antes da infra estar 100%. As rotas que
 * dependem de DB/Redis/storage falham individualmente com o mesmo erro do zod
 * quando chamam `useEnv()`.
 */
export default defineNitroPlugin(() => {
  try {
    const env = useEnv()
    console.log(`[env] ok — NODE_ENV=${env.NODE_ENV}`)
  } catch (err) {
    if (import.meta.dev) throw err
    console.error(err instanceof Error ? err.message : String(err))
    console.error(
      '[env] boot seguindo mesmo assim — rotas que usam infra vão retornar 500 até as vars serem definidas',
    )
  }
})
