CREATE TYPE "public"."ai_feature" AS ENUM('summary', 'minutes', 'chapters', 'translate', 'extraction', 'content');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."qa_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."summary_length" AS ENUM('short', 'medium', 'detailed');--> statement-breakpoint
CREATE TABLE "ai_generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"feature" "ai_feature" NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"status" "generation_status" DEFAULT 'generating' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"titles" jsonb NOT NULL,
	"description" text NOT NULL,
	"hashtags" jsonb NOT NULL,
	"short_ideas" jsonb NOT NULL,
	"social_posts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_content_video_id_unique" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "video_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"fields" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_extractions_video_id_unique" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "video_minutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"topics" jsonb NOT NULL,
	"decisions" jsonb NOT NULL,
	"tasks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_minutes_video_id_unique" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "video_qa_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"role" "qa_role" NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"length" "summary_length" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"language" text NOT NULL,
	"text" text NOT NULL,
	"segments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_generation_runs" ADD CONSTRAINT "ai_generation_runs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content" ADD CONSTRAINT "video_content_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_extractions" ADD CONSTRAINT "video_extractions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_minutes" ADD CONSTRAINT "video_minutes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_qa_messages" ADD CONSTRAINT "video_qa_messages_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_summaries" ADD CONSTRAINT "video_summaries_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_translations" ADD CONSTRAINT "video_translations_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generation_runs_video_idx" ON "ai_generation_runs" USING btree ("video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_generation_runs_unique" ON "ai_generation_runs" USING btree ("video_id","feature","variant");--> statement-breakpoint
CREATE INDEX "video_chapters_video_idx" ON "video_chapters" USING btree ("video_id","idx");--> statement-breakpoint
CREATE INDEX "video_qa_messages_video_idx" ON "video_qa_messages" USING btree ("video_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "video_summaries_unique" ON "video_summaries" USING btree ("video_id","length");--> statement-breakpoint
CREATE UNIQUE INDEX "video_translations_unique" ON "video_translations" USING btree ("video_id","language");