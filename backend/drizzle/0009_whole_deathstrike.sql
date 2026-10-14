ALTER TABLE "memberships" ADD COLUMN "attended" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "no_shows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "last_seen_at" timestamp with time zone;