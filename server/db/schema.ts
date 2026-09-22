import { relations } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'agency'])

export const videoStatusEnum = pgEnum('video_status', [
  'uploading', // criado, aguardando o PUT no storage
  'uploaded', // não usado no fluxo atual — mantido pela migration já aplicada
  'queued', // upload confirmado; vídeo sem pipeline fica aqui, áudio aguarda o usuário mandar transcrever
  'extracting', // (Fase 3B) extraindo áudio de vídeo com ffmpeg
  'transcribing',
  'analyzing', // (Fase 6) resumo / capítulos
  'ready',
  'failed',
])

export const mediaKindEnum = pgEnum('media_kind', ['audio', 'video'])

export const jobTypeEnum = pgEnum('job_type', [
  'audio_extract',
  'transcribe',
  'analyze',
  'embed',
  'generate',
])

export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'active',
  'completed',
  'failed',
])

export const usageKindEnum = pgEnum('usage_kind', [
  'transcription_seconds',
  'llm_input_tokens',
  'llm_output_tokens',
  'storage_bytes',
])

export const verificationTokenKindEnum = pgEnum('verification_token_kind', [
  'email_verify',
  'password_reset',
])

// (Fase 6-8) 7 features de IA sobre a transcrição — cada uma gera sob
// demanda, de forma independente (não é mais um estágio do pipeline
// upload→extração→transcrição→ready, que `videoStatusEnum`/`jobTypeEnum`
// acima já cobrem). `aiGenerationRuns` rastreia só o estado transitório
// "gerando"/"falhou"; "pronto" nunca é gravado ali — é inferido pela
// existência da linha de conteúdo na tabela da feature.
export const aiFeatureEnum = pgEnum('ai_feature', [
  'summary',
  'minutes',
  'chapters',
  'translate',
  'extraction',
  'content',
])

export const generationStatusEnum = pgEnum('generation_status', [
  'generating',
  'failed',
])

export const summaryLengthEnum = pgEnum('summary_length', [
  'short',
  'medium',
  'detailed',
])

export const qaRoleEnum = pgEnum('qa_role', ['user', 'assistant'])

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/* ------------------------------------------------------------------ *
 * Tabelas
 * ------------------------------------------------------------------ */
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text(),
  passwordHash: text(), // null para contas criadas via Google
  emailVerifiedAt: timestamp({ withTimezone: true }),
  googleId: text().unique(), // sub do Google — null se a conta nunca usou OAuth
  plan: planEnum().notNull().default('free'),
  // idioma da interface (código do @nuxtjs/i18n, ex. 'pt-BR', 'en') — aplicado
  // no login/fetchUser; visitante anônimo usa o cookie do módulo em vez disso
  preferredLocale: text().notNull().default('pt-BR'),
  ...timestamps,
})

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(), // token opaco de sessão
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    kind: verificationTokenKindEnum().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_tokens_user_idx').on(t.userId)],
)

export const videos = pgTable(
  'videos',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    mediaKind: mediaKindEnum().notNull().default('audio'),
    originalFilename: text(),
    storageKey: text(), // chave do objeto original no bucket
    mimeType: text(),
    sizeBytes: bigint({ mode: 'number' }),
    durationSeconds: integer(),
    language: text(),
    status: videoStatusEnum().notNull().default('uploading'),
    error: text(),
    ...timestamps,
  },
  (t) => [
    index('videos_user_id_idx').on(t.userId),
    index('videos_status_idx').on(t.status),
  ],
)

export const transcripts = pgTable('transcripts', {
  id: uuid().primaryKey().defaultRandom(),
  videoId: uuid()
    .notNull()
    .unique('transcripts_video_id_unique')
    .references(() => videos.id, { onDelete: 'cascade' }),
  text: text().notNull(),
  provider: text(),
  language: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid().primaryKey().defaultRandom(),
    transcriptId: uuid()
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    idx: integer().notNull(), // ordem do segmento
    startMs: integer().notNull(),
    endMs: integer().notNull(),
    text: text().notNull(),
  },
  (t) => [
    index('transcript_segments_transcript_idx').on(t.transcriptId, t.idx),
    index('transcript_segments_video_idx').on(t.videoId),
  ],
)

export const transcriptWords = pgTable(
  'transcript_words',
  {
    id: uuid().primaryKey().defaultRandom(),
    transcriptId: uuid()
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    // nulo quando a transcrição veio sem quadros de legenda
    segmentId: uuid().references(() => transcriptSegments.id, {
      onDelete: 'cascade',
    }),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    idx: integer().notNull(), // ordem da palavra dentro da transcrição
    startMs: integer().notNull(),
    endMs: integer().notNull(),
    text: text().notNull(),
    // confiança do modelo na palavra (log-probabilidade, <= 0)
    logprob: real(),
  },
  (t) => [
    index('transcript_words_transcript_idx').on(t.transcriptId, t.idx),
    index('transcript_words_segment_idx').on(t.segmentId, t.idx),
    index('transcript_words_video_idx').on(t.videoId),
  ],
)

/* ------------------------------------------------------------------ *
 * IA sobre a transcrição (Fase 6-8)
 * ------------------------------------------------------------------ */
export const aiGenerationRuns = pgTable(
  'ai_generation_runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    feature: aiFeatureEnum().notNull(),
    // discrimina múltiplas gerações da mesma feature (length do resumo,
    // idioma da tradução); '' pras features com uma única instância por vídeo
    variant: text().notNull().default(''),
    status: generationStatusEnum().notNull().default('generating'),
    error: text(),
    ...timestamps,
  },
  (t) => [
    index('ai_generation_runs_video_idx').on(t.videoId),
    uniqueIndex('ai_generation_runs_unique').on(
      t.videoId,
      t.feature,
      t.variant,
    ),
  ],
)

export const videoSummaries = pgTable(
  'video_summaries',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    length: summaryLengthEnum().notNull(),
    content: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('video_summaries_unique').on(t.videoId, t.length)],
)

export const videoMinutes = pgTable('video_minutes', {
  id: uuid().primaryKey().defaultRandom(),
  videoId: uuid()
    .notNull()
    .unique('video_minutes_video_id_unique')
    .references(() => videos.id, { onDelete: 'cascade' }),
  topics: jsonb()
    .$type<{ title: string; description: string }[]>()
    .notNull(),
  decisions: jsonb()
    .$type<{ text: string; note: string | null }[]>()
    .notNull(),
  tasks: jsonb()
    .$type<
      { description: string; owner: string | null; dueDate: string | null }[]
    >()
    .notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const videoChapters = pgTable(
  'video_chapters',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    idx: integer().notNull(),
    title: text().notNull(),
    description: text(),
    startMs: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('video_chapters_video_idx').on(t.videoId, t.idx)],
)

export const videoQaMessages = pgTable(
  'video_qa_messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    role: qaRoleEnum().notNull(),
    content: text().notNull(),
    // só respostas da IA têm citação; pergunta do usuário fica null
    citations: jsonb().$type<
      { segmentId: string; startMs: number; excerpt: string }[] | null
    >(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('video_qa_messages_video_idx').on(t.videoId, t.createdAt)],
)

export const videoTranslations = pgTable(
  'video_translations',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    language: text().notNull(),
    text: text().notNull(),
    segments: jsonb().$type<
      { idx: number; startMs: number; endMs: number; text: string }[] | null
    >(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('video_translations_unique').on(t.videoId, t.language),
  ],
)

export const videoExtractions = pgTable('video_extractions', {
  id: uuid().primaryKey().defaultRandom(),
  videoId: uuid()
    .notNull()
    .unique('video_extractions_video_id_unique')
    .references(() => videos.id, { onDelete: 'cascade' }),
  fields: jsonb()
    .$type<{ name: string; type: 'text' | 'number' | 'date' | 'currency' }[]>()
    .notNull(),
  result: jsonb().$type<{ name: string; value: string | null }[]>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const videoContent = pgTable('video_content', {
  id: uuid().primaryKey().defaultRandom(),
  videoId: uuid()
    .notNull()
    .unique('video_content_video_id_unique')
    .references(() => videos.id, { onDelete: 'cascade' }),
  titles: jsonb().$type<{ text: string; style: string }[]>().notNull(),
  description: text().notNull(),
  hashtags: jsonb().$type<string[]>().notNull(),
  shortIdeas: jsonb()
    .$type<
      {
        startMs: number
        endMs: number
        hook: string
        reason: string
        script: string[]
      }[]
    >()
    .notNull(),
  socialPosts: jsonb()
    .$type<{ platform: string; text: string }[]>()
    .notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const jobs = pgTable(
  'jobs',
  {
    id: uuid().primaryKey().defaultRandom(),
    videoId: uuid()
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    type: jobTypeEnum().notNull(),
    status: jobStatusEnum().notNull().default('queued'),
    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(3),
    queueJobId: text(), // id do job na fila BullMQ
    payload: jsonb().$type<Record<string, unknown>>(),
    result: jsonb().$type<Record<string, unknown>>(),
    error: text(),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('jobs_video_idx').on(t.videoId),
    index('jobs_status_idx').on(t.status),
  ],
)

export const usage = pgTable(
  'usage',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid().references(() => videos.id, { onDelete: 'set null' }),
    kind: usageKindEnum().notNull(),
    quantity: bigint({ mode: 'number' }).notNull(),
    periodMonth: text().notNull(), // 'YYYY-MM' — facilita agregação mensal
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('usage_user_period_idx').on(t.userId, t.periodMonth)],
)

/* ------------------------------------------------------------------ *
 * Relations (API de query do Drizzle)
 * ------------------------------------------------------------------ */
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  sessions: many(sessions),
  verificationTokens: many(verificationTokens),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const verificationTokensRelations = relations(
  verificationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [verificationTokens.userId],
      references: [users.id],
    }),
  }),
)

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  transcript: one(transcripts),
  segments: many(transcriptSegments),
  words: many(transcriptWords),
  jobs: many(jobs),
  aiGenerationRuns: many(aiGenerationRuns),
  summaries: many(videoSummaries),
  minutes: one(videoMinutes),
  chapters: many(videoChapters),
  qaMessages: many(videoQaMessages),
  translations: many(videoTranslations),
  extraction: one(videoExtractions),
  content: one(videoContent),
}))

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  video: one(videos, {
    fields: [transcripts.videoId],
    references: [videos.id],
  }),
  segments: many(transcriptSegments),
  words: many(transcriptWords),
}))

export const transcriptSegmentsRelations = relations(
  transcriptSegments,
  ({ one, many }) => ({
    transcript: one(transcripts, {
      fields: [transcriptSegments.transcriptId],
      references: [transcripts.id],
    }),
    video: one(videos, {
      fields: [transcriptSegments.videoId],
      references: [videos.id],
    }),
    words: many(transcriptWords),
  }),
)

export const transcriptWordsRelations = relations(
  transcriptWords,
  ({ one }) => ({
    transcript: one(transcripts, {
      fields: [transcriptWords.transcriptId],
      references: [transcripts.id],
    }),
    segment: one(transcriptSegments, {
      fields: [transcriptWords.segmentId],
      references: [transcriptSegments.id],
    }),
    video: one(videos, {
      fields: [transcriptWords.videoId],
      references: [videos.id],
    }),
  }),
)

export const jobsRelations = relations(jobs, ({ one }) => ({
  video: one(videos, { fields: [jobs.videoId], references: [videos.id] }),
}))

export const aiGenerationRunsRelations = relations(
  aiGenerationRuns,
  ({ one }) => ({
    video: one(videos, {
      fields: [aiGenerationRuns.videoId],
      references: [videos.id],
    }),
  }),
)

export const videoSummariesRelations = relations(
  videoSummaries,
  ({ one }) => ({
    video: one(videos, {
      fields: [videoSummaries.videoId],
      references: [videos.id],
    }),
  }),
)

export const videoMinutesRelations = relations(videoMinutes, ({ one }) => ({
  video: one(videos, {
    fields: [videoMinutes.videoId],
    references: [videos.id],
  }),
}))

export const videoChaptersRelations = relations(videoChapters, ({ one }) => ({
  video: one(videos, {
    fields: [videoChapters.videoId],
    references: [videos.id],
  }),
}))

export const videoQaMessagesRelations = relations(
  videoQaMessages,
  ({ one }) => ({
    video: one(videos, {
      fields: [videoQaMessages.videoId],
      references: [videos.id],
    }),
  }),
)

export const videoTranslationsRelations = relations(
  videoTranslations,
  ({ one }) => ({
    video: one(videos, {
      fields: [videoTranslations.videoId],
      references: [videos.id],
    }),
  }),
)

export const videoExtractionsRelations = relations(
  videoExtractions,
  ({ one }) => ({
    video: one(videos, {
      fields: [videoExtractions.videoId],
      references: [videos.id],
    }),
  }),
)

export const videoContentRelations = relations(videoContent, ({ one }) => ({
  video: one(videos, {
    fields: [videoContent.videoId],
    references: [videos.id],
  }),
}))

/* ------------------------------------------------------------------ *
 * Tipos inferidos
 * ------------------------------------------------------------------ */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type VerificationToken = typeof verificationTokens.$inferSelect
export type Video = typeof videos.$inferSelect
export type NewVideo = typeof videos.$inferInsert
export type Transcript = typeof transcripts.$inferSelect
export type TranscriptSegment = typeof transcriptSegments.$inferSelect
export type NewTranscriptSegment = typeof transcriptSegments.$inferInsert
export type TranscriptWord = typeof transcriptWords.$inferSelect
export type NewTranscriptWord = typeof transcriptWords.$inferInsert
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type UsageRecord = typeof usage.$inferSelect
export type AiFeature = (typeof aiFeatureEnum.enumValues)[number]
export type SummaryLength = (typeof summaryLengthEnum.enumValues)[number]
export type QaRole = (typeof qaRoleEnum.enumValues)[number]
export type AiGenerationRun = typeof aiGenerationRuns.$inferSelect
export type VideoSummary = typeof videoSummaries.$inferSelect
export type VideoMinutes = typeof videoMinutes.$inferSelect
export type VideoChapter = typeof videoChapters.$inferSelect
export type VideoQaMessage = typeof videoQaMessages.$inferSelect
export type VideoTranslation = typeof videoTranslations.$inferSelect
export type VideoExtraction = typeof videoExtractions.$inferSelect
export type VideoContent = typeof videoContent.$inferSelect
