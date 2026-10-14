ALTER TABLE "events" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "category_label" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "beginner_friendly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "min_viable" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "going" integer DEFAULT 0 NOT NULL;