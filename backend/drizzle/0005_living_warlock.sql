ALTER TABLE "communities" ADD COLUMN "owner_photo_media_id" text;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "owner_bio" text[];--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "highlights" jsonb;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "house_rules" text[];--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_photo_media_id_media_id_fk" FOREIGN KEY ("owner_photo_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;