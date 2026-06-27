CREATE TABLE "league_match_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"team_id" text NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_match_stats" ADD CONSTRAINT "league_match_stats_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_match_stats" ADD CONSTRAINT "league_match_stats_match_id_league_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."league_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_match_stats" ADD CONSTRAINT "league_match_stats_player_id_roster_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."roster_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_match_stats" ADD CONSTRAINT "league_match_stats_team_id_league_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."league_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_match_stats_match_player_uq" ON "league_match_stats" USING btree ("match_id","player_id");