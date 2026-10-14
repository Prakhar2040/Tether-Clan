CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"media_id" text,
	"color" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"by_id" text NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"event_id" text
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_by_id_people_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_community_taken_idx" ON "photos" USING btree ("community_id","taken_at");