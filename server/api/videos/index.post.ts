import { z } from 'zod'
import { videos } from '../../db/schema'

const Body = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.literal('audio/mpeg'),
  sizeBytes: z.number().int().positive(),
})

/**
 * Cria o registro do áudio e devolve uma URL pré-assinada para o cliente
 * enviar o arquivo direto ao storage (PUT).
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const { MAX_UPLOAD_BYTES } = useEnv()

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requisição inválida',
      data: parsed.error.issues,
    })
  }
  const { filename, contentType, sizeBytes } = parsed.data

  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `Arquivo acima do limite de ${Math.floor(
        MAX_UPLOAD_BYTES / 1024 / 1024,
      )} MB`,
    })
  }

  const id = crypto.randomUUID()
  const storageKey = `media/${id}/source.mp3`
  const db = useDrizzle()

  const [video] = await db
    .insert(videos)
    .values({
      id,
      userId: user.id,
      title: filename.replace(/\.[^.]+$/, ''),
      mediaKind: 'audio',
      originalFilename: filename,
      mimeType: contentType,
      sizeBytes,
      storageKey,
      status: 'uploading',
    })
    .returning()

  const uploadUrl = await presignPut(storageKey, contentType, 600)

  setResponseStatus(event, 201)
  return { id: video!.id, uploadUrl }
})
