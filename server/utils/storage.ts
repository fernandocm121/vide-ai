import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { useEnv } from './env'

/**
 * Cliente S3-compatível (MinIO no local, Cloudflare R2 / AWS S3 em produção).
 * A Fase 3 adiciona helpers de upload (URLs pré-assinadas) aqui.
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
