import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { students, categories } from "./academy";
import { users } from "./auth";

/**
 * Cobros de una escuela (Fase 3). Todo se aísla por `schoolId`.
 *
 *   plans        → definiciones de precio (cuota mensual, inscripción, evento, producto)
 *   enrollments  → qué alumno está suscrito a qué plan mensual
 *   charges      → libro mayor: lo que un alumno debe/pagó (manual o automático)
 *
 * Stripe Connect: cada escuela cobra a su propia cuenta conectada (Express).
 * El dinero nunca pasa por la plataforma; por eso `schools.stripeAccountId` +
 * el estado de habilitación viven en la escuela.
 */

/** Tipo de cobro. Reutilizado por `plans` y `charges`. */
export const chargeKind = pgEnum("charge_kind", [
  "monthly", // cuota mensual recurrente
  "enrollment", // inscripción única
  "event", // torneo / evento puntual
  "product", // uniforme / artículo
]);

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: chargeKind("kind").notNull(),
  // Monto en centavos para evitar errores de redondeo (ej. $500.00 = 50000).
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("MXN"),
  // Plan ligado a una categoría (ej. "Sub-10 mensual"). Opcional.
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const enrollmentStatus = pgEnum("enrollment_status", [
  "active",
  "paused",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    status: enrollmentStatus("status").notNull().default("active"),
    startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Un alumno no se suscribe dos veces al mismo plan.
  (t) => [uniqueIndex("enrollments_student_plan_uq").on(t.studentId, t.planId)]
);

export const chargeStatus = pgEnum("charge_status", [
  "pending",
  "paid",
  "failed",
  "canceled",
  "refunded",
]);

export const charges = pgTable(
  "charges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Plan que originó el cargo (si aplica). Se conserva el cargo aunque se
    // borre el plan, por historial.
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    kind: chargeKind("kind").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("MXN"),
    // Periodo "YYYY-MM" para cuotas mensuales; null para cobros únicos.
    periodMonth: text("period_month"),
    status: chargeStatus("status").notNull().default("pending"),
    dueDate: date("due_date", { mode: "string" }),
    paidAt: timestamp("paid_at", { mode: "date" }),
    stripeCheckoutId: text("stripe_checkout_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Evita doble cargo del mismo plan/mes para un alumno. En cobros únicos
  // (periodMonth null) Postgres trata los NULL como distintos, así que no
  // bloquea inscripciones/eventos múltiples.
  (t) => [
    uniqueIndex("charges_student_plan_period_uq").on(
      t.studentId,
      t.planId,
      t.periodMonth
    ),
  ]
);

export const autopayStatus = pgEnum("autopay_status", [
  "pending", // se creó el customer pero aún no hay tarjeta guardada
  "active", // tarjeta guardada y lista para cobro automático
  "off", // el tutor lo desactivó
]);

/**
 * Pago automático de un alumno (enfoque B): el tutor guarda una tarjeta una vez
 * (Stripe Customer en la cuenta conectada de la escuela) y, al generar las
 * cuotas del mes, se cobra off-session a esa tarjeta. Una fila por alumno.
 */
export const autopay = pgTable(
  "autopay",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Tutor que registró la tarjeta.
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // En la cuenta CONECTADA de la escuela.
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    status: autopayStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("autopay_student_uq").on(t.studentId)]
);

export const autopayRelations = relations(autopay, ({ one }) => ({
  student: one(students, {
    fields: [autopay.studentId],
    references: [students.id],
  }),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  school: one(schools, {
    fields: [plans.schoolId],
    references: [schools.id],
  }),
  category: one(categories, {
    fields: [plans.categoryId],
    references: [categories.id],
  }),
  enrollments: many(enrollments),
  charges: many(charges),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  plan: one(plans, {
    fields: [enrollments.planId],
    references: [plans.id],
  }),
}));

export const chargesRelations = relations(charges, ({ one }) => ({
  student: one(students, {
    fields: [charges.studentId],
    references: [students.id],
  }),
  plan: one(plans, {
    fields: [charges.planId],
    references: [plans.id],
  }),
}));
