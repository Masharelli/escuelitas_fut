ALTER TABLE "match_player_stats" ADD COLUMN "yellow_cards" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_player_stats" ADD COLUMN "red_cards" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_player_stats" ADD COLUMN "minutes_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "required_uniform" text;