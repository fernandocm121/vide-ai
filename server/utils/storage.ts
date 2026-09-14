import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { useEnv } from './env'

/**
 * Cliente S3-compatível (MinIO no local, Cloudflare R2 / AWS S3 em produção).
 */
let s3: S3Client | null = null

export function useS3(): S3Client {
  if (s3) return s3

  const env = useEnv()
  s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  })
  return s3
}

export function storageBucket(): string {
  return useEnv().S3_BUCKET
}

/** Confirma que o bucket existe e está acessível. Lança em caso de falha. */
export async function checkStorage(): Promise<void> {
  await useS3().send(new HeadBucketCommand({ Bucket: storageBucket() }))
}

/** URL pré-assinada para o cliente enviar o arquivo (PUT direto no storage). */
export function presignPut(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  return getSignedUrl(
    useS3(),
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  )
}

/** URL pré-assinada para o cliente baixar/tocar o arquivo (GET). */
export function presignGet(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    useS3(),
    new GetObjectCommand({ Bucket: storageBucket(), Key: key }),
    { expiresIn },
  )
}

/** Metadados do objeto (usado para confirmar que o upload chegou). */
export function headObject(key: string) {
  return useS3().send(
    new HeadObjectCommand({ Bucket: storageBucket(), Key: key }),
  )
}

/** Baixa o objeto inteiro para memória. Só para arquivos pequenos (áudio). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await useS3().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: key }),
  )
  const bytes = await res.Body!.transformToByteArray()
  return Buffer.from(bytes)
}

/**
 * Baixa o objeto direto para um arquivo em disco (stream) — usado para vídeo,
 * que pode ter até 2 GB e não deve ser bufferizado inteiro em memória.
 */
export async function downloadToFile(
  key: string,
  destPath: string,
): Promise<void> {
  const res = await useS3().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: key }),
  )
  await pipeline(res.Body as NodeJS.ReadableStream, createWriteStream(destPath))
}

/** Sobe o conteúdo de um arquivo em disco (stream) para o storage. */
export async function putObjectFile(
  key: string,
  filePath: string,
  contentType: string,
): Promise<void> {
  await useS3().send(
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType,
    }),
  )
}

export function deleteObject(key: string) {
  return useS3().send(
    new DeleteObjectCommand({ Bucket: storageBucket(), Key: key }),
  )
}
