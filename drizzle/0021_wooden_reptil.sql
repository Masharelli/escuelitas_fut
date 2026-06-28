CREATE TYPE "public"."school_plan" AS ENUM('basic', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('nomina', 'arbitraje', 'renta_campo', 'material', 'viaje', 'uniforme', 'otro');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"category" "expense_category" DEFAULT 'otro' NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"spent_on" date NOT NULL,
	"category_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "plan" "school_plan" DEFAULT 'premium' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_school_spent_idx" ON "expenses" USING btree ("school_id","spent_on");