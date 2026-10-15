ALTER TYPE "public"."order_state" ADD VALUE 'expired';--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"event_id" text NOT NULL,
	"ref" text NOT NULL,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_provider" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_ref" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_ref_idx" ON "tickets" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "tickets_order_idx" ON "tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tickets_event_idx" ON "tickets" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_one_live_idx" ON "orders" USING btree ("event_id","person_id") WHERE state in ('held', 'paid');--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_ref_idx" ON "orders" USING btree ("payment_provider","payment_ref") WHERE payment_ref is not null;