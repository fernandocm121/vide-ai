/**
 * Fecha conexões (Postgres, Redis) no encerramento do servidor.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    await Promise.allSettled([closeDrizzle(), closeRedis()])
  })
})
