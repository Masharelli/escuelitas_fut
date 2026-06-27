CREATE TYPE "public"."league_charge_status" AS ENUM('pending', 'paid', 'canceled');--> statement-breakpoint
CREATE TABLE "league_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"season_id" text NOT NULL,
	"team_id" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"status" "league_charge_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"stripe_checkout_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "registration_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "league_charges" ADD CONSTRAINT "league_charges_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_charges" ADD CONSTRAINT "league_charges_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_charges" ADD CONSTRAINT "league_charges_team_id_league_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."league_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_charges_season_team_uq" ON "league_charges" USING btree ("season_id","team_id");