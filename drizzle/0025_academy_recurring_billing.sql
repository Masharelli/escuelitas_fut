ALTER TABLE "students" ADD COLUMN "scholarship_payment_day" integer;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "renewal_year" integer;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "base_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "scholarship_name" text;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "autopay_attempted_at" timestamp;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "annual_renewal_starts_on" date;--> statement-breakpoint
CREATE UNIQUE INDEX "charges_student_renewal_year_uq" ON "charges" USING btree ("student_id","renewal_year");