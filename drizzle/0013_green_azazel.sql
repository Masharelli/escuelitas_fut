CREATE TYPE "public"."league_match_status" AS ENUM('scheduled', 'played', 'canceled');--> statement-breakpoint
CREATE TABLE "league_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"season_id" text NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"scheduled_at" timestamp,
	"location" text,
	"status" "league_match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_home_team_id_league_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."league_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_away_team_id_league_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."league_teams"("id") ON DELETE cascade ON UPDATE no action;