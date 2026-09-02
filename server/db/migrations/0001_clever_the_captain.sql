CREATE TYPE "public"."media_kind" AS ENUM('audio', 'video');--> statement-breakpoint
ALTER TYPE "public"."video_status" ADD VALUE 'uploaded' BEFORE 'queued';--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "media_kind" "media_kind" DEFAULT 'audio' NOT NULL;