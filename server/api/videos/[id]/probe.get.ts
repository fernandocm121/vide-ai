import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(exec)

/** Metadados técnicos (duração, codec, bitrate) de uma mídia por URL. */
export default defineEventHandler(async (event) => {
  await getCurrentUser(event)
  const { url } = getQuery(event)

  const { stdout } = await run(
    `ffprobe -v error -show_format -of json ${String(url)}`,
  )
  return JSON.parse(stdout)
})
