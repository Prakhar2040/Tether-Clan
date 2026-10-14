CREATE TABLE "competitions" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"held_on" date NOT NULL,
	"entrants" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"person_id" text NOT NULL,
	"place" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitions_community_held_idx" ON "competitions" USING btree ("community_id","held_on");--> statement-breakpoint
CREATE UNIQUE INDEX "results_once_idx" ON "results" USING btree ("competition_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_place_idx" ON "results" USING btree ("competition_id","place");--> statement-breakpoint
CREATE INDEX "results_person_idx" ON "results" USING btree ("person_id");