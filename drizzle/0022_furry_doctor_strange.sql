CREATE TYPE "public"."discount_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
ALTER TYPE "public"."match_event_type" ADD VALUE 'kick_off';--> statement-breakpoint
ALTER TYPE "public"."match_event_type" ADD VALUE 'half_time';--> statement-breakpoint
ALTER TYPE "public"."match_event_type" ADD VALUE 'second_half';--> statement-breakpoint
ALTER TYPE "public"."match_event_type" ADD VALUE 'full_time';--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "discount_kind" NOT NULL,
	"value" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"discount_id" text NOT NULL,
	"student_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "enrolled_on" date;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "reenrolled_on" date;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "results_image_url" text;--> statement-breakpoint
ALTER TABLE "callups" ADD COLUMN "rsvp_token" text DEFAULT gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_discounts_uq" ON "student_discounts" USING btree ("discount_id","student_id");