import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { charges, guardianships, plans, students, schools } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return charge.dueDate < todayISO;
}

/** Pesos escritos por el admin (ej. "500" o "500.50") → centavos enteros. */
export function pesosToCents(input: string): number | null {
  const n = Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Genera los cargos de cuota mensual de un periodo para la escuela. Por cada
 * plan mensual activo, crea un cargo PENDIENTE a cada alumno activo objetivo
 * (los de su categoría, o todos si el plan no tiene categoría). Es idempotente:
 * si el cargo de ese alumno/plan/periodo ya existe, no lo duplica.
 *
 * Devuelve cuántos cargos nuevos se crearon.
 */
export async function generateMonthlyCharges(
  schoolId: string,
  period: string
): Promise<number> {
  const tdb = tenantDb(schoolId);

  const monthlyPlans = await tdb.plans.findMany({
    where: and(eq(plans.kind, "monthly"), eq(plans.active, true)),
  });
  if (monthlyPlans.length === 0) return 0;

  // Fecha de vencimiento = día configurado por la escuela, dentro del periodo.
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, schoolId),
    columns: { paymentDueDay: true },
  });
  const dueDate = school?.paymentDueDay
    ? `${period}-${String(school.paymentDueDay).padStart(2, "0")}`
    : null;

  const label = periodLabel(period);
  const rows: {
    studentId: string;
    planId: string;
    kind: ChargeKind;
    description: string;
    amountCents: number;
    currency: string;
    periodMonth: string;
    dueDate: string | null;
  }[] = [];

  for (const plan of monthlyPlans) {
    const targets = await tdb.students.findMany({
      where: plan.categoryId
        ? and(
            eq(students.status, "active"),
            eq(students.categoryId, plan.categoryId)
          )
        : eq(students.status, "active"),
      columns: { id: true },
    });

    for (const s of targets) {
      rows.push({
        studentId: s.id,
        planId: plan.id,
        kind: "monthly",
        description: `${plan.name} · ${label}`,
        amountCents: plan.amountCents,
        currency: plan.currency,
        periodMonth: period,
        dueDate,
      });
    }
  }

  const created = await tdb.charges.insertManyIgnoringDuplicates(rows);
  // Avisa a los tutores SOLO de las cuotas nuevas (no de duplicados omitidos).
  await notifyChargesCreated(schoolId, created);
  return created.length;
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
