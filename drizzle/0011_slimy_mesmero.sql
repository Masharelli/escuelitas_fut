CREATE TYPE "public"."org_kind" AS ENUM('academy', 'league');--> statement-breakpoint
CREATE TYPE "public"."sport" AS ENUM('futbol', 'beisbol', 'softbol', 'basquetbol');--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "kind" "org_kind" DEFAULT 'academy' NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "sport" "sport" DEFAULT 'futbol' NOT NULL;