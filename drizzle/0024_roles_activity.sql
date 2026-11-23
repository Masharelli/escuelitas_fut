CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD COLUMN "role" text DEFAULT 'coach' NOT NULL;--> statement-breakpoint
CREATE INDEX "activity_log_school_created_idx" ON "activity_log" USING btree ("school_id","created_at");--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_role_check" CHECK ("staff_invitations"."role" in ('coach', 'admin'));
--> statement-breakpoint
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.activity_log FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE public.activity_log FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE public.activity_log FROM authenticated; END IF;
END $$;
