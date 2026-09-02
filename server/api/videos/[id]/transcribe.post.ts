import { and, eq } from 'drizzle-orm'
import { jobs, videos } from '../../../db/schema'
import { runTranscription } from '../../../transcription/run'

const TRANSCRIBABLE = ['uploaded', 'failed'] as const

/** Enfileira a transcrição e dispara o processamento em background. */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle()

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  })
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Não encontrado' })
  }
  if (!TRANSCRIBABLE.includes(video.status as (typeof TRANSCRIBABLE)[number])) {
    throw createError({
      statusCode: 409,
      statusMessage: `Não é possível transcrever no status "${video.status}"`,
    })
  }

  const [job] = await db
    .insert(jobs)
    .values({ videoId: id, type: 'transcribe', status: 'queued' })
    .returning()

  await db
    .update(videos)
    .set({ status: 'queued', error: null })
    .where(eq(videos.id, id))

  // background — não bloqueia a resposta
  runTranscription(id, job!.id).catch((err) => {
    console.error('[transcribe] erro não tratado:', err)
  })

  setResponseStatus(event, 202)
  return { status: 'queued' }
})
