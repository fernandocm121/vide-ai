CREATE TYPE "public"."job_status" AS ENUM('queued', 'active', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('audio_extract', 'transcribe', 'analyze', 'embed', 'generate');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro', 'agency');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('transcription_seconds', 'llm_input_tokens', 'llm_output_tokens', 'storage_bytes');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('uploading', 'queued', 'extracting', 'transcribing', 'analyzing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"queue_job_id" text,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"text" text NOT NULL,
	"provider" text,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcripts_video_id_unique" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid,
	"kind" "usage_kind" NOT NULL,
	"quantity" bigint NOT NULL,
	"period_month" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"original_filename" text,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" bigint,
	"duration_seconds" integer,
	"language" text,
	"status" "video_status" DEFAULT 'uploading' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_video_idx" ON "jobs" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transcript_segments_transcript_idx" ON "transcript_segments" USING btree ("transcript_id","idx");--> statement-breakpoint
CREATE INDEX "transcript_segments_video_idx" ON "transcript_segments" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "usage_user_period_idx" ON "usage" USING btree ("user_id","period_month");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");