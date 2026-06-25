import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";

/**
 * Roles dentro de una escuela. El modelo es multi-escuela (SaaS): un usuario
 * se relaciona con una escuela mediante una membresía con un rol.
 *  - owner : creó/posee la escuela (acceso total, facturación)
 *  - admin : administra alumnos, equipos, pagos, partidos
 *  - coach : entrenador (acceso acotado a sus equipos) — uso futuro
 *  - parent: padre/madre/tutor que ve a sus hijos y paga
 */
export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "coach",
  "parent",
]);

/**
 * Tipo de organización (tenant). El mismo producto sirve dos modelos:
 *  - academy: escuela/academia dueña de sus categorías y alumnos (mensualidades)
 *  - league : liga que registra equipos independientes y organiza una temporada
 * Las escuelitas existentes quedan como `academy` (default).
 */
export const orgKind = pgEnum("org_kind", ["academy", "league"]);

/** Deporte de la organización; configura estadísticas y regla de tabla. */
export const sportEnum = pgEnum("sport", [
  "futbol",
  "beisbol",
  "softbol",
  "basquetbol",
]);

/** Una organización = un tenant. Todo dato de dominio se aísla por `schoolId`. */
export const schools = pgTable("schools", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // slug único para URLs/subdominios (ej. /e/aguilas-fc)
  slug: text("slug").unique().notNull(),
  // Modelo de la organización y su deporte (multideporte / ligas). Las
  // escuelitas existentes quedan como academy + futbol por defecto.
  kind: orgKind("kind").notNull().default("academy"),
  sport: sportEnum("sport").notNull().default("futbol"),
  logoUrl: text("logo_url"),
  // Perfil de la escuela (editable por el admin en Fase 1)
  description: text("description"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  primaryColor: text("primary_color"),
  // Día del mes en que vencen las cuotas mensuales (1-28). Null = sin vencimiento.
  paymentDueDay: integer("payment_due_day"),
  // Cuenta conectada de Stripe (Stripe Connect Express) — Fase 3 (pagos).
  stripeAccountId: text("stripe_account_id"),
  // ¿La escuela completó el onboarding y ya puede cobrar? (webhook account.updated)
  stripeChargesEnabled: boolean("stripe_charges_enabled")
    .notNull()
    .default(false),
  stripeDetailsSubmitted: boolean("stripe_details_submitted")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/** Relación usuario ↔ escuela con un rol. Un usuario puede pertenecer a varias. */
export const memberships = pgTable(
  "memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("parent"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (m) => [uniqueIndex("memberships_user_school_uq").on(m.userId, m.schoolId)]
);

export const schoolsRelations = relations(schools, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [memberships.schoolId],
    references: [schools.id],
  }),
}));
