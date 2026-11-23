import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Historial de operaciones; conserva el actor incluso si se elimina su cuenta. */
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name"),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, string[]>>().notNull(),
  status: text("status").notNull().default("started"),
  createdAt: timestamp("created_at", { mode: "date", precision: 3 }).defaultNow().notNull(),
}, (t) => [index("activity_log_school_created_idx").on(t.schoolId, t.createdAt)]).enableRLS();
