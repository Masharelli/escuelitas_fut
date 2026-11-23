import { and, desc, eq, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { charges, guardianships, schools, studentDiscounts, students } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";
import { billingDate, type DiscountRow } from "@/lib/billing-rules";
import {
  guardiansOfStudents,
  notifyStudentGuardians,
  notifyUsers,
} from "@/lib/notifications";

export type ChargeKind = "monthly" | "enrollment" | "event" | "product";

export const KIND_LABELS: Record<ChargeKind, string> = {
  monthly: "Cuota mensual",
  enrollment: "Inscripción",
  event: "Evento / torneo",
  product: "Producto",
};

export const CHARGE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-06" → "Junio 2026". Devuelve el crudo si no parsea. */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return period;
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}

/** Mes actual en formato "YYYY-MM" (para el default del generador). */
export function currentPeriod(): string {
  return billingDate().slice(0, 7);
}

/** Mes "YYYY-MM" efectivo de un cargo: su periodo, o el mes en que se creó. */
export function effectiveMonth(c: {
  periodMonth: string | null;
  createdAt: Date;
}): string {
  if (c.periodMonth) return c.periodMonth;
  const d = c.createdAt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type ChargeLike = {
  status: string;
  amountCents: number;
  paidAt: Date | null;
};

export type ChargesSummary = {
  paidThisMonthCents: number;
  pendingCents: number;
  pendingCount: number;
};

/** Resumen financiero: cobrado en el mes actual, pendiente total y # pendientes. */
export function summarizeCharges(
  rows: ChargeLike[],
  now: Date
): ChargesSummary {
  const y = now.getFullYear();
  const m = now.getMonth();
  let paidThisMonthCents = 0;
  let pendingCents = 0;
  let pendingCount = 0;
  for (const c of rows) {
    if (c.status === "pending") {
      pendingCents += c.amountCents;
      pendingCount += 1;
    } else if (c.status === "paid" && c.paidAt) {
      if (c.paidAt.getFullYear() === y && c.paidAt.getMonth() === m) {
        paidThisMonthCents += c.amountCents;
      }
    }
  }
  return { paidThisMonthCents, pendingCents, pendingCount };
}

/** Suma de lo pendiente en un conjunto de cargos (saldo). */
export function pendingBalance(rows: ChargeLike[]): number {
  return rows
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.amountCents, 0);
}

/** Centavos → "$500.00" (MXN por defecto). */
export function formatMoney(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** "2026-06-05" → "5 jun 2026". Vacío si no hay fecha. */
export function formatDueDate(due: string | null): string {
  if (!due) return "";
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** ¿El cargo está vencido? (pendiente y su fecha límite ya pasó). */
export function isOverdue(charge: {
  status: string;
  dueDate: string | null;
}): boolean {
  if (charge.status !== "pending" || !charge.dueDate) return false;
  return charge.dueDate < billingDate();
}

/**
 * Semáforo de pagos de un alumno: verde = sin adeudos, amarillo = tiene cargo
 * pendiente pero aún no vence (o sin fecha límite), rojo = tiene cargo vencido.
 */
export type TrafficLight = "green" | "yellow" | "red";

export const TRAFFIC_LIGHT_LABELS: Record<TrafficLight, string> = {
  green: "Al corriente",
  yellow: "Cuota por vencer",
  red: "Pago vencido",
};

export function trafficLightOf(
  rows: { status: string; dueDate: string | null }[]
): TrafficLight {
  let light: TrafficLight = "green";
  for (const c of rows) {
    if (c.status !== "pending") continue;
    if (isOverdue(c)) return "red";
    light = "yellow";
  }
  return light;
}

/** Semáforo por alumno para un conjunto de alumnos de la escuela. */
export async function paymentTrafficLights(
  schoolId: string,
  studentIds: string[]
): Promise<Map<string, TrafficLight>> {
  const map = new Map<string, TrafficLight>();
  if (studentIds.length === 0) return map;
  const rows = await tenantDb(schoolId).charges.findMany({
    where: inArray(charges.studentId, studentIds),
    columns: { studentId: true, status: true, dueDate: true },
  });
  const byStudent = new Map<string, { status: string; dueDate: string | null }[]>();
  for (const r of rows) {
    const list = byStudent.get(r.studentId) ?? [];
    list.push(r);
    byStudent.set(r.studentId, list);
  }
  for (const id of studentIds) {
    map.set(id, trafficLightOf(byStudent.get(id) ?? []));
  }
  return map;
}

/** Pesos escritos por el admin (ej. "500" o "500.50") → centavos enteros. */
export function pesosToCents(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  // amount_cents es un integer de Postgres.
  return Number.isSafeInteger(cents) && cents <= 2147483647 ? cents : null;
}

/** Descuentos activos por alumno. Devuelve Map studentId → descuentos. */
export async function activeDiscountsByStudent(
  schoolId: string,
  studentId?: string,
  executor: Pick<typeof db, "query"> = db,
): Promise<Map<string, DiscountRow[]>> {
  const tdb = tenantDb(schoolId);
  const rows = await executor.query.studentDiscounts.findMany({
    where: tdb.studentDiscounts.scope(studentId ? eq(studentDiscounts.studentId, studentId) : undefined),
    with: { discount: true },
    orderBy: [studentDiscounts.createdAt, studentDiscounts.id],
  });
  const map = new Map<string, DiscountRow[]>();
  for (const r of rows) {
    if (!r.discount?.active || r.discount.schoolId !== schoolId) continue;
    const list = map.get(r.studentId) ?? [];
    list.push(r.discount);
    map.set(r.studentId, list);
  }
  return map;
}

export function scholarshipLabel(discount: DiscountRow) {
  return `${discount.name} · ${discount.kind === "percent" ? `${discount.value}%` : formatMoney(discount.value)}`;
}

type CreatedCharge = {
  studentId: string;
  description: string;
  amountCents: number;
  currency: string;
  dueDate: string | null;
};

/**
 * Avisa a los tutores de cada cargo recién creado. Agrupa por mensaje (los
 * alumnos del mismo plan/monto comparten texto) para emitir pocos avisos en
 * lote en vez de uno por alumno.
 */
export async function notifyChargesCreated(
  schoolId: string,
  created: CreatedCharge[]
): Promise<void> {
  if (created.length === 0) return;
  const byStudent = await guardiansOfStudents(created.map((c) => c.studentId));

  const groups = new Map<string, { body: string; studentIds: string[] }>();
  for (const c of created) {
    const due = c.dueDate ? ` · vence el ${formatDueDate(c.dueDate)}` : "";
    const body = `${c.description} · ${formatMoney(c.amountCents, c.currency)}${due}`;
    const g = groups.get(body) ?? { body, studentIds: [] };
    g.studentIds.push(c.studentId);
    groups.set(body, g);
  }

  for (const g of groups.values()) {
    const recipients = g.studentIds.flatMap((id) => byStudent.get(id) ?? []);
    await notifyUsers(recipients, {
      schoolId,
      type: "charge_created",
      title: "Nueva cuota por pagar",
      body: g.body,
      link: "/padres/pagos",
    });
  }
}

type BillingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function stampPaidEnrollment(tx: BillingTx, charge: typeof charges.$inferSelect) {
  if (charge.kind !== "enrollment" || !charge.paidAt) return;
  const today = billingDate(charge.paidAt);
  await tx.update(students).set({
    reenrolledOn: sql`greatest(${students.reenrolledOn}, ${today}::date)`,
    enrolledOn: sql`coalesce(${students.enrolledOn}, ${today}::date)`,
  }).where(and(eq(students.id, charge.studentId), eq(students.schoolId, charge.schoolId)));
}

export async function recordStripeChargePayment({
  chargeId, stripeAccountId, amount, currency, checkoutId, paymentIntentId,
}: {
  chargeId: string;
  stripeAccountId: string;
  amount: number;
  currency: string;
  checkoutId?: string;
  paymentIntentId: string;
}) {
  const school = await db.query.schools.findFirst({ where: eq(schools.stripeAccountId, stripeAccountId) });
  if (!school) return false;
  const paid = await db.transaction(async (tx) => {
    const [updated] = await tx.update(charges).set({
      status: "paid", paidAt: new Date(), stripePaymentIntentId: paymentIntentId,
      ...(checkoutId ? { stripeCheckoutId: checkoutId } : { autopayAttemptedAt: new Date() }),
    }).where(and(
      eq(charges.id, chargeId), eq(charges.schoolId, school.id), eq(charges.status, "pending"),
      eq(charges.amountCents, amount), eq(charges.currency, currency.toUpperCase()),
      checkoutId ? eq(charges.stripeCheckoutId, checkoutId) : isNull(charges.stripeCheckoutId),
      or(isNull(charges.stripePaymentIntentId), eq(charges.stripePaymentIntentId, paymentIntentId)),
    )).returning();
    if (!updated) return false;
    await stampPaidEnrollment(tx, updated);
    return true;
  });
  if (paid) await notifyChargePaidById(chargeId);
  return paid;
}

/**
 * Recibo de pago a los tutores del alumno. Recibe el id del cargo, lo lee y
 * avisa. Best-effort: si el cargo no existe, no hace nada.
 */
export async function notifyChargePaidById(chargeId: string): Promise<void> {
  const c = await db.query.charges.findFirst({
    where: eq(charges.id, chargeId),
  });
  if (!c) return;
  await notifyStudentGuardians(c.studentId, {
    schoolId: c.schoolId,
    type: "charge_paid",
    title: "Pago recibido",
    body: `${c.description} · ${formatMoney(c.amountCents, c.currency)}`,
    link: "/padres/pagos",
  });
}

/** Operación de caja: solo cargos pendientes autorizados de esta escuela. */
export async function markManualChargePaid(schoolId: string, chargeId: string) {
  const where = and(eq(charges.id, chargeId), eq(charges.schoolId, schoolId), eq(charges.status, "pending"));
  const charge = await db.query.charges.findFirst({ where });
  if (!charge) return false;
  if (charge.kind === "monthly") {
    const { generateMonthlyCharges } = await import("@/lib/recurring-billing");
    await generateMonthlyCharges(schoolId, currentPeriod(), billingDate(), charge.studentId, false);
  }
  const paid = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(charges).where(where).for("update");
    if (!row || row.stripePaymentIntentId) return null;
    if (row.stripeCheckoutId) {
      const { expireUnpaidCheckout } = await import("@/lib/stripe");
      const school = await tx.query.schools.findFirst({ where: eq(schools.id, schoolId) });
      if (!(await expireUnpaidCheckout(school?.stripeAccountId, row.stripeCheckoutId))) return null;
    }
    const [updated] = await tx.update(charges).set({ status: "paid", paidAt: new Date(), stripeCheckoutId: null })
      .where(where).returning();
    await stampPaidEnrollment(tx, updated);
    return updated;
  });
  if (!paid) return false;
  await notifyChargePaidById(paid.id);
  return true;
}

export function isManualPayment(charge: {
  status: string;
  paidAt: Date | null;
  stripeCheckoutId: string | null;
  stripePaymentIntentId: string | null;
}) {
  return charge.status === "paid" && !!charge.paidAt && !charge.stripeCheckoutId && !charge.stripePaymentIntentId;
}

export async function undoManualChargePayment(schoolId: string, chargeId: string) {
  const reopened = await db.transaction(async (tx) => {
    const where = and(eq(charges.id, chargeId), eq(charges.schoolId, schoolId));
    const [charge] = await tx.select().from(charges).where(where).for("update");
    if (!charge || !isManualPayment(charge)) return null;
    await tx.update(charges).set({ status: "pending", paidAt: null, autopayAttemptedAt: new Date() }).where(where);
    if (charge.kind === "enrollment") {
      const last = await tx.query.charges.findFirst({
        where: and(eq(charges.schoolId, schoolId), eq(charges.studentId, charge.studentId),
          eq(charges.kind, "enrollment"), eq(charges.status, "paid"), isNotNull(charges.paidAt)),
        orderBy: [desc(charges.paidAt)],
      });
      await tx.update(students).set({ reenrolledOn: last?.paidAt ? billingDate(last.paidAt) : null })
        .where(and(eq(students.id, charge.studentId), eq(students.schoolId, schoolId),
          eq(students.reenrolledOn, billingDate(charge.paidAt!))));
    }
    return charge;
  });
  if (reopened?.kind === "monthly") {
    const { generateMonthlyCharges } = await import("@/lib/recurring-billing");
    await generateMonthlyCharges(schoolId, currentPeriod(), billingDate(), reopened.studentId, false);
  }
}

export async function cancelPendingCharge(schoolId: string, chargeId: string) {
  await db.transaction(async (tx) => {
    const where = and(eq(charges.id, chargeId), eq(charges.schoolId, schoolId),
      eq(charges.status, "pending"), isNull(charges.stripePaymentIntentId));
    const [charge] = await tx.select().from(charges).where(where).for("update");
    if (!charge) return;
    if (charge.stripeCheckoutId) {
      const school = await tx.query.schools.findFirst({ where: eq(schools.id, schoolId) });
      const { expireUnpaidCheckout } = await import("@/lib/stripe");
      if (!(await expireUnpaidCheckout(school?.stripeAccountId, charge.stripeCheckoutId))) return;
    }
    await tx.update(charges).set({ status: "canceled", stripeCheckoutId: null }).where(where);
  });
}

/**
 * Cargos de TODOS los hijos vinculados a un tutor (a través de guardianships),
 * más recientes primero. Es la frontera correcta del portal de padres: ve los
 * cargos de sus propios hijos, aunque sean de escuelas distintas.
 */
export async function getMyChildrenCharges(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    columns: { studentId: true },
  });
  const ids = links.map((l) => l.studentId);
  if (ids.length === 0) return [];

  return db.query.charges.findMany({
    where: inArray(charges.studentId, ids),
    with: { student: { columns: { firstName: true, lastName: true } } },
    orderBy: [desc(charges.createdAt)],
  });
}
