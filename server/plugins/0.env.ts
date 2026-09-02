/**
 * Valida as variáveis de ambiente no boot do servidor.
 * Falha cedo e com mensagem clara se algo estiver faltando.
 */
export default defineNitroPlugin(() => {
  const env = useEnv()
  console.log(`[env] ok — NODE_ENV=${env.NODE_ENV}`)
})
