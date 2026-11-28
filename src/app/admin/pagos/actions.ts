"use server";

import { recordActivity } from "@/lib/activity";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { students, schools, studentDiscounts } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { getStripe } from "@/lib/stripe";
import {
  notifyChargesCreated,
  markManualChargePaid,
  cancelPendingCharge,
  pesosToCents,
  type ChargeKind,
} from "@/lib/billing";
import { billingDate, isBillingPeriod } from "@/lib/billing-rules";
import { generateMonthlyCharges } from "@/lib/recurring-billing";

export type FormState = { error?: string; ok?: boolean; period?: string } | undefined;

async function refreshScholarships(schoolId: string, studentId?: string) {
  const today = billingDate();
  await generateMonthlyCharges(schoolId, today.slice(0, 7), today, studentId, false);
  revalidatePath("/admin/becas");
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin/alumnos/[id]", "page");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/finanzas/[studentId]", "page");
  revalidatePath("/admin/pagos");
  revalidatePath("/padres/pagos");
}

/**
 * Inicia (o reanuda) el onboarding de Stripe Connect Express de la escuela.
 * Crea la cuenta conectada si no existe y redirige al formulario hosteado de
 * Stripe; al terminar, Stripe regresa a la configuración de cuotas.
 */
export async function connectStripe() {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Configurar pagos en línea", new FormData(), async () => {
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, membership.schoolId),
  });
  if (!school) redirect("/admin/cuotas");

  const stripe = getStripe();
  let accountId = school.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "MX",
      email: school.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: { name: school.name },
    });
    accountId = account.id;
    await db
      .update(schools)
      .set({ stripeAccountId: accountId })
      .where(eq(schools.id, school.id));
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/cuotas#configuracion`,
    return_url: `${origin}/admin/cuotas?connected=1#configuracion`,
    type: "account_onboarding",
  });

  redirect(link.url);
  });
}

const KINDS = ["monthly", "enrollment", "event", "product"] as const;

const planSchema = z.object({
  name: z.string().min(1, "Escribe el nombre del plan"),
  kind: z.enum(KINDS),
  amount: z.string().min(1, "Escribe el monto"),
  categoryId: z.string().nullish(),
  description: z.string().max(500).nullish(),
});

export async function createPlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Guardar precio autorizado", formData, async () => {
  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const amountCents = pesosToCents(parsed.data.amount);
  if (amountCents === null || amountCents === 0) {
    return { error: "Monto inválido" };
  }

  const tdb = tenantDb(membership.schoolId);
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await tdb.categories.findById(parsed.data.categoryId);
    if (!cat) return { error: "Categoría inválida" };
    categoryId = cat.id;
  }

  const id = String(formData.get("id") ?? "");
  const existing = id ? await tdb.plans.findById(id) : null;
  if (id && !existing) return { error: "Registro no encontrado" };
  const annualRenewal = formData.get("annualRenewal") === "on";
  if (annualRenewal && parsed.data.kind !== "enrollment") {
    return { error: "La renovación anual se aplica a los planes de inscripción." };
  }
  const values = {
    name: parsed.data.name,
    kind: parsed.data.kind,
    amountCents,
    categoryId,
    description: parsed.data.description || null,
    annualRenewalStartsOn: annualRenewal ? existing?.annualRenewalStartsOn ?? billingDate() : null,
  };
  if (id) {
    await tdb.plans.updateById(id, values);
  } else {
    await tdb.plans.insert(values);
  }

  revalidatePath("/admin/cuotas");
  return { ok: true };
  });
}

export async function setPaymentSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership, session } = await requireRole(ADMIN_ROLES);
  if (membership.role !== "owner") redirect("/admin/pagos");
  return recordActivity(membership, session.user.name, "Configurar calendario de cuotas", formData, async () => {
    const generationDay = Number(formData.get("generationDay"));
    const rawDueDay = String(formData.get("dueDay") ?? "").trim();
    const dueDay = rawDueDay === "" ? null : Number(rawDueDay);
    if (!Number.isInteger(generationDay) || generationDay < 1 || generationDay > 28) {
      return { error: "El día de generación debe estar entre 1 y 28." };
    }
    if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < generationDay || dueDay > 28)) {
      return { error: "El vencimiento debe ser igual o posterior al día de generación y hasta el día 28." };
    }

    await db.update(schools)
      .set({ paymentGenerationDay: generationDay, paymentDueDay: dueDay })
      .where(eq(schools.id, membership.schoolId));
    await refreshScholarships(membership.schoolId);
    revalidatePath("/admin/cuotas");
    return { ok: true };
  });
}

export async function deletePlan(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Eliminar plan de cobro", formData, async () => {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).plans.deleteById(id);
  }
  revalidatePath("/admin/cuotas");
  });
}

export async function generateCharges(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Generar cuotas mensuales", formData, async () => {
  const period = String(formData.get("period") ?? "");
  if (!isBillingPeriod(period)) {
    return { error: "Elige un mes válido" };
  }

  await generateMonthlyCharges(membership.schoolId, period);
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/finanzas");
  return { ok: true, period };
  });
}

const oneOffSchema = z.object({
  kind: z.enum(["enrollment", "event", "product"]),
  name: z.string().min(1, "Escribe el concepto del cobro"),
  amount: z.string().min(1, "Escribe el monto"),
  target: z.enum(["school", "category", "student"]),
  categoryId: z.string().nullish(),
  studentId: z.string().nullish(),
});

/** Crea un cobro único (inscripción/evento/producto) a un grupo de alumnos. */
export async function createOneOffCharge(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Crear cargo autorizado", formData, async () => {
  const parsed = oneOffSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    target: formData.get("target"),
    categoryId: formData.get("categoryId"),
    studentId: formData.get("studentId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const amountCents = pesosToCents(parsed.data.amount);
  if (amountCents === null || amountCents === 0) {
    return { error: "Monto inválido" };
  }

  const tdb = tenantDb(membership.schoolId);

  // Resuelve a qué alumnos se les cobra según el destino.
  let targets: { id: string }[];
  if (parsed.data.target === "student") {
    if (!parsed.data.studentId) return { error: "Elige un alumno" };
    const student = await tdb.students.findById(parsed.data.studentId);
    if (!student) return { error: "Alumno inválido" };
    targets = [{ id: student.id }];
  } else if (parsed.data.target === "category") {
    if (!parsed.data.categoryId) return { error: "Elige una categoría" };
    const cat = await tdb.categories.findById(parsed.data.categoryId);
    if (!cat) return { error: "Categoría inválida" };
    targets = await tdb.students.findMany({
      where: and(eq(students.status, "active"), eq(students.categoryId, cat.id)),
      columns: { id: true },
    });
  } else {
    targets = await tdb.students.findMany({
      where: eq(students.status, "active"),
      columns: { id: true },
    });
  }
  if (targets.length === 0) {
    return { error: "No hay alumnos activos para ese destino" };
  }

  const created = await tdb.charges.insertManyIgnoringDuplicates(
    targets.map((s) => ({
      studentId: s.id,
      planId: null,
      kind: parsed.data.kind as ChargeKind,
      description: parsed.data.name,
      amountCents,
      periodMonth: null,
    }))
  );
  await notifyChargesCreated(membership.schoolId, created);

  revalidatePath("/admin/pagos");
  revalidatePath("/admin/finanzas");
  return { ok: true };
  });
}

const discountSchema = z.object({
  name: z.string().min(1, "Escribe el nombre de la beca/promoción"),
  kind: z.enum(["percent", "fixed"]),
  value: z.string().min(1, "Escribe el descuento"),
});

/** Crea una beca o promoción (descuento % o monto fijo). */
export async function createDiscount(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Guardar beca o promoción", formData, async () => {
  const parsed = discountSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let value: number | null;
  if (parsed.data.kind === "percent") {
    const n = Number(parsed.data.value);
    value = Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
    if (value === null) return { error: "El porcentaje debe ser de 1 a 100" };
  } else {
    value = pesosToCents(parsed.data.value);
    if (!value) return { error: "Monto inválido" };
  }

  const tdb = tenantDb(membership.schoolId);
  const id = String(formData.get("id") ?? "");
  const values = {
    name: parsed.data.name,
    kind: parsed.data.kind,
    value,
  };
  if (id) {
    if (!(await tdb.discounts.findById(id))) return { error: "Registro no encontrado" };
    await tdb.discounts.updateById(id, values);
    await refreshScholarships(membership.schoolId);
  } else {
    await tdb.discounts.insert(values);
    revalidatePath("/admin/becas");
  }
  return { ok: true };
  });
}

export async function deleteDiscount(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Eliminar beca o promoción", formData, async () => {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).discounts.deleteById(id);
    await refreshScholarships(membership.schoolId);
  }
  });
}

/** Asigna una beca/promoción a uno o varios alumnos. */
export async function assignDiscount(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Otorgar beca o promoción", formData, async () => {
  const discountId = String(formData.get("discountId") ?? "");
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  if (!discountId || studentIds.length === 0) return;

  const tdb = tenantDb(membership.schoolId);
  const discount = await tdb.discounts.findById(discountId);
  if (!discount?.active) return;

  // Solo alumnos de la escuela.
  const valid = await tdb.students.findMany({
    where: inArray(students.id, studentIds),
    columns: { id: true },
  });
  await tdb.studentDiscounts.insertManyIgnoringDuplicates(
    valid.map((s) => ({ discountId, studentId: s.id }))
  );
  if (valid.length) await refreshScholarships(membership.schoolId, valid.length === 1 ? valid[0].id : undefined);
  });
}

export async function unassignDiscount(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Retirar beca o promoción", formData, async () => {
  const id = String(formData.get("id") ?? "");
  if (id) {
    const [removed] = await db.delete(studentDiscounts)
      .where(and(eq(studentDiscounts.id, id), eq(studentDiscounts.schoolId, membership.schoolId)))
      .returning({ studentId: studentDiscounts.studentId });
    if (removed) await refreshScholarships(membership.schoolId, removed.studentId);
  }
  });
}

export async function markChargePaid(formData: FormData) {
  const { membership, session } = await requireRole(ADMIN_ROLES);
  return recordActivity(membership, session.user.name, "Registrar pago de alumno", formData, async () => {
  const id = String(formData.get("id") ?? "");
  if (id) await markManualChargePaid(membership.schoolId, id);
  revalidatePath("/admin/pagos");
  });
}

export async function cancelCharge(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Cancelar cargo de alumno", formData, async () => {
  const id = String(formData.get("id") ?? "");
  if (id) await cancelPendingCharge(membership.schoolId, id);
  revalidatePath("/admin/pagos");
  });
}
