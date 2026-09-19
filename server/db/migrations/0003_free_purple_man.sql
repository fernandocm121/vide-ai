CREATE TABLE "transcript_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"segment_id" uuid,
	"video_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"logprob" real
);
--> statement-breakpoint
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_segment_id_transcript_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."transcript_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcript_words_transcript_idx" ON "transcript_words" USING btree ("transcript_id","idx");--> statement-breakpoint
CREATE INDEX "transcript_words_segment_idx" ON "transcript_words" USING btree ("segment_id","idx");--> statement-breakpoint
CREATE INDEX "transcript_words_video_idx" ON "transcript_words" USING btree ("video_id");