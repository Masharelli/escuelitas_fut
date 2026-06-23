import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { charges, guardianships, plans, students } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";

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

/** Centavos → "$500.00" (MXN por defecto). */
export function formatMoney(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
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

  const label = periodLabel(period);
  const rows: {
    studentId: string;
    planId: string;
    kind: ChargeKind;
    description: string;
    amountCents: number;
    currency: string;
    periodMonth: string;
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
      });
    }
  }

  await tdb.charges.insertManyIgnoringDuplicates(rows);
  // Devolvemos el total objetivo; los duplicados se ignoran en la inserción y
  // la UI relee el estado real al recargar.
  return rows.length;
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
