"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { students, schools } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { getStripe } from "@/lib/stripe";
import {
  generateMonthlyCharges,
  pesosToCents,
  type ChargeKind,
} from "@/lib/billing";

export type FormState = { error?: string; ok?: boolean } | undefined;

/**
 * Inicia (o reanuda) el onboarding de Stripe Connect Express de la escuela.
 * Crea la cuenta conectada si no existe y redirige al formulario hosteado de
 * Stripe; al terminar, Stripe regresa a /admin/pagos.
 */
export async function connectStripe() {
  const { membership } = await requireRole(["owner", "admin"]);
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, membership.schoolId),
  });
  if (!school) redirect("/admin/pagos");

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
    refresh_url: `${origin}/admin/pagos`,
    return_url: `${origin}/admin/pagos?connected=1`,
    type: "account_onboarding",
  });

  redirect(link.url);
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
  const { membership } = await requireRole(ADMIN_ROLES);
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

  await tdb.plans.insert({
    name: parsed.data.name,
    kind: parsed.data.kind,
    amountCents,
    categoryId,
    description: parsed.data.description || null,
  });

  revalidatePath("/admin/pagos");
  return { ok: true };
}

export async function deletePlan(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).plans.deleteById(id);
  }
  revalidatePath("/admin/pagos");
}

const periodRe = /^\d{4}-\d{2}$/;

export async function generateCharges(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const period = String(formData.get("period") ?? "");
  if (!periodRe.test(period)) {
    return { error: "Elige un mes válido" };
  }

  await generateMonthlyCharges(membership.schoolId, period);
  revalidatePath("/admin/pagos");
  return { ok: true };
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
  const { membership } = await requireRole(ADMIN_ROLES);
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

  await tdb.charges.insertManyIgnoringDuplicates(
    targets.map((s) => ({
      studentId: s.id,
      planId: null,
      kind: parsed.data.kind as ChargeKind,
      description: parsed.data.name,
      amountCents,
      periodMonth: null,
    }))
  );

  revalidatePath("/admin/pagos");
  return { ok: true };
}

export async function markChargePaid(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).charges.updateById(id, {
      status: "paid",
      paidAt: new Date(),
    });
  }
  revalidatePath("/admin/pagos");
}

export async function cancelCharge(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).charges.updateById(id, {
      status: "canceled",
    });
  }
  revalidatePath("/admin/pagos");
}
