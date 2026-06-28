"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { requireFeature } from "@/lib/plan";
import { tenantDb } from "@/lib/tenant-db";
import { pesosToCents } from "@/lib/billing";

export type FormState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  category: z.enum([
    "nomina",
    "arbitraje",
    "renta_campo",
    "material",
    "viaje",
    "uniforme",
    "otro",
  ]),
  description: z.string().min(1, "Escribe una descripción"),
  amount: z.string().min(1, "Escribe el monto"),
  spentOn: z.string().min(1, "Elige la fecha"),
  categoryId: z.string().nullish(),
  notes: z.string().nullish(),
});

export async function createExpense(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  requireFeature(membership.school.plan, "expenses");

  const parsed = schema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    spentOn: formData.get("spentOn"),
    categoryId: formData.get("categoryId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const amountCents = pesosToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { error: "Monto inválido" };
  }

  const tdb = tenantDb(membership.schoolId);

  // Verifica que la categoría (si se indicó) sea de esta escuela.
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await tdb.categories.findById(parsed.data.categoryId);
    if (cat) categoryId = cat.id;
  }

  await tdb.expenses.insert({
    category: parsed.data.category,
    description: parsed.data.description.trim(),
    amountCents,
    spentOn: parsed.data.spentOn,
    categoryId,
    notes: parsed.data.notes?.trim() || null,
  });

  revalidatePath("/admin/gastos");
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function deleteExpense(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  requireFeature(membership.school.plan, "expenses");
  const id = String(formData.get("id") ?? "");
  if (id) await tenantDb(membership.schoolId).expenses.deleteById(id);
  revalidatePath("/admin/gastos");
  revalidatePath("/admin/finanzas");
}
