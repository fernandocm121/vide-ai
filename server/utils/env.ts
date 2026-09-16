import { z } from 'zod'

/**
 * Validação das variáveis de ambiente do servidor.
 * `useEnv()` faz o parse uma única vez e lança um erro legível se algo
 * estiver faltando. É chamado no boot pelo plugin `server/plugins/0.env.ts`.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // PostgreSQL
  DATABASE_URL: z
    .string()
    .min(1, 'obrigatório (ex.: postgresql://user:pass@host:5432/db)'),

  // Redis
  REDIS_URL: z.string().min(1, 'obrigatório (ex.: redis://localhost:6379)'),

  // Object storage (S3-compatível)
  S3_ENDPOINT: z.string().url('deve ser uma URL (ex.: http://localhost:9000)'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1, 'obrigatório'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'obrigatório'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'obrigatório'),
  // qualquer valor diferente de "false" => true (MinIO precisa de path-style)
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),

  // Upload de áudio — limite de 25 MB (restrição da API de transcrição da OpenAI)
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26_214_400),
  // Upload de vídeo (MP4/MOV/WEBM) — sem limite do Whisper, mas precisa de teto
  MAX_VIDEO_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2_147_483_648), // 2 GB

  // Transcrição (Fase 3) — OpenAI Whisper
  OPENAI_API_KEY: z.string().min(1, 'obrigatório para a transcrição (Fase 3)'),

  // Limite do plano gratuito — minutos de transcrição por mês (30 min default)
  FREE_PLAN_MONTHLY_SECONDS: z.coerce.number().int().positive().default(1800),

  // Integrações de IA — opcionais até a Fase 6
  ANTHROPIC_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function useEnv(): Env {
  if (cached) return cached

  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('\n')
    throw new Error(
      `\n[env] Variáveis de ambiente inválidas ou ausentes:\n${issues}\n\n` +
        `Rode: cp .env.example .env\n`,
    )
  }

  cached = parsed.data
  return cached
}
