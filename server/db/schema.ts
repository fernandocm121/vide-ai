import { relations } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'agency'])

export const videoStatusEnum = pgEnum('video_status', [
  'uploading',
  'queued',
  'extracting',
  'transcribing',
  'analyzing',
  'ready',
  'failed',
])

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
  passwordHash: text(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  plan: planEnum().notNull().default('free'),
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

export const videos = pgTable(
  'videos',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
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
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  transcript: one(transcripts),
  segments: many(transcriptSegments),
  jobs: many(jobs),
}))

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  video: one(videos, { fields: [transcripts.videoId], references: [videos.id] }),
  segments: many(transcriptSegments),
}))

export const transcriptSegmentsRelations = relations(
  transcriptSegments,
  ({ one }) => ({
    transcript: one(transcripts, {
      fields: [transcriptSegments.transcriptId],
      references: [transcripts.id],
    }),
    video: one(videos, {
      fields: [transcriptSegments.videoId],
      references: [videos.id],
    }),
  }),
)

export const jobsRelations = relations(jobs, ({ one }) => ({
  video: one(videos, { fields: [jobs.videoId], references: [videos.id] }),
}))

/* ------------------------------------------------------------------ *
 * Tipos inferidos
 * ------------------------------------------------------------------ */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Video = typeof videos.$inferSelect
export type NewVideo = typeof videos.$inferInsert
export type Transcript = typeof transcripts.$inferSelect
export type TranscriptSegment = typeof transcriptSegments.$inferSelect
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type UsageRecord = typeof usage.$inferSelect
