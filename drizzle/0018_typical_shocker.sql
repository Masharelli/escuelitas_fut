CREATE TYPE "public"."rsvp_status" AS ENUM('pending', 'yes', 'no');--> statement-breakpoint
CREATE TABLE "callups" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"match_id" text,
	"session_id" text,
	"student_id" text NOT NULL,
	"rsvp" "rsvp_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "callups" ADD CONSTRAINT "callups_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callups" ADD CONSTRAINT "callups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callups" ADD CONSTRAINT "callups_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callups" ADD CONSTRAINT "callups_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "callups_match_student_uq" ON "callups" USING btree ("match_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "callups_session_student_uq" ON "callups" USING btree ("session_id","student_id");