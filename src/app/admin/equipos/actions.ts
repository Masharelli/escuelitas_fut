"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { categories } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

export type FormState = { error?: string; ok?: boolean } | undefined;

const categorySchema = z.object({
  name: z.string().min(1, "Escribe el nombre de la categoría"),
  birthYear: z
    .union([z.coerce.number().int().min(1980).max(2100), z.literal("")])
    .optional(),
});

export async function createCategory(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    birthYear: formData.get("birthYear"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const birthYear =
    typeof parsed.data.birthYear === "number" ? parsed.data.birthYear : null;

  const tdb = tenantDb(membership.schoolId);

  // Evita duplicados por nombre dentro de la escuela (el schoolId lo añade el facade).
  const existing = await tdb.categories.findFirst({
    where: eq(categories.name, parsed.data.name),
  });
  if (existing) {
    return { error: "Ya existe una categoría con ese nombre" };
  }

  await tdb.categories.insert({ name: parsed.data.name, birthYear });
  revalidatePath("/admin/equipos");
  return { ok: true };
}

const teamSchema = z.object({
  name: z.string().min(1, "Escribe el nombre del equipo"),
  categoryId: z.string().nullish(),
  color: z.string().nullish(),
});

export async function createTeam(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const tdb = tenantDb(membership.schoolId);

  // Si mandan categoría, verifica que sea de esta escuela.
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await tdb.categories.findById(parsed.data.categoryId);
    if (!cat) return { error: "Categoría inválida" };
    categoryId = cat.id;
  }

  await tdb.teams.insert({
    name: parsed.data.name,
    categoryId,
    color: parsed.data.color || null,
  });
  revalidatePath("/admin/equipos");
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).categories.deleteById(id);
  }
  revalidatePath("/admin/equipos");
}

export async function deleteTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).teams.deleteById(id);
  }
  revalidatePath("/admin/equipos");
}
