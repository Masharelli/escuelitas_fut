ALTER TABLE "memberships" ADD COLUMN "also_coach" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "memberships" AS m
SET "also_coach" = true
WHERE m."role" = 'admin'
  AND EXISTS (
    SELECT 1 FROM "coach_teams" AS c
    WHERE c."school_id" = m."school_id" AND c."user_id" = m."user_id"
  );
