"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, teams } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";

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

  // Evita duplicados por nombre dentro de la escuela.
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(categories.schoolId, membership.schoolId),
      eq(categories.name, parsed.data.name)
    ),
  });
  if (existing) {
    return { error: "Ya existe una categoría con ese nombre" };
  }

  await db.insert(categories).values({
    schoolId: membership.schoolId,
    name: parsed.data.name,
    birthYear,
  });
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

  // Si mandan categoría, verifica que sea de esta escuela.
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, parsed.data.categoryId),
        eq(categories.schoolId, membership.schoolId)
      ),
    });
    if (!cat) return { error: "Categoría inválida" };
    categoryId = cat.id;
  }

  await db.insert(teams).values({
    schoolId: membership.schoolId,
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
    await db
      .delete(categories)
      .where(
        and(eq(categories.id, id), eq(categories.schoolId, membership.schoolId))
      );
  }
  revalidatePath("/admin/equipos");
}

export async function deleteTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db
      .delete(teams)
      .where(and(eq(teams.id, id), eq(teams.schoolId, membership.schoolId)));
  }
  revalidatePath("/admin/equipos");
}
