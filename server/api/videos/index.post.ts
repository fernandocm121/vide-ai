import { z } from 'zod'
import { videos } from '../../db/schema'

/** Formatos aceitos nesta versão — mapeia o `contentType` p/ extensão + mediaKind. */
const ACCEPTED_TYPES: Record<string, { ext: string; kind: 'audio' | 'video' }> =
  {
    'video/mp4': { ext: 'mp4', kind: 'video' },
    'video/quicktime': { ext: 'mov', kind: 'video' },
    'video/webm': { ext: 'webm', kind: 'video' },
    'audio/mpeg': { ext: 'mp3', kind: 'audio' },
    'audio/wav': { ext: 'wav', kind: 'audio' },
    'audio/x-wav': { ext: 'wav', kind: 'audio' },
    'audio/wave': { ext: 'wav', kind: 'audio' },
  }

const Body = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(Object.keys(ACCEPTED_TYPES) as [string, ...string[]]),
  sizeBytes: z.number().int().positive(),
})

/**
 * Cria o registro do vídeo/áudio e devolve uma URL pré-assinada para o cliente
 * enviar o arquivo direto ao storage (PUT).
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const { MAX_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES } = useEnv()

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requisição inválida',
      data: parsed.error.issues,
    })
  }
  const { filename, contentType, sizeBytes } = parsed.data
  const { ext, kind } = ACCEPTED_TYPES[contentType]!

  const maxBytes = kind === 'video' ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES
  if (sizeBytes > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: `Arquivo acima do limite de ${Math.floor(
        maxBytes / 1024 / 1024,
      )} MB`,
    })
  }

  const id = crypto.randomUUID()
  const storageKey = `media/${id}/source.${ext}`
  const db = useDrizzle()

  const [video] = await db
    .insert(videos)
    .values({
      id,
      userId: user.id,
      title: filename.replace(/\.[^.]+$/, ''),
      mediaKind: kind,
      originalFilename: filename,
      mimeType: contentType,
      sizeBytes,
      storageKey,
      status: 'uploading',
    })
    .returning()

  // arquivos de vídeo podem ser grandes — dá mais tempo para o PUT terminar
  const uploadUrl = await presignPut(
    storageKey,
    contentType,
    kind === 'video' ? 10800 : 900,
  )

  setResponseStatus(event, 201)
  return { id: video!.id, uploadUrl }
})
