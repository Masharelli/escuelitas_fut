"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireRole } from "@/lib/tenant";
import { saveImage, hasUpload } from "@/lib/uploads";

export type FormState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  name: z.string().min(2, "Escribe el nombre de la escuela"),
  description: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  primaryColor: z.string().max(20).optional(),
});

export async function updateSchool(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // Solo dueño/admin pueden editar el perfil de la escuela.
  const { membership } = await requireRole(["owner", "admin"]);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (hasUpload(logo)) {
    try {
      logoUrl = await saveImage(logo, "escudo");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo subir el escudo" };
    }
  }

  const { name, description, phone, email, address, city, primaryColor } =
    parsed.data;

  await db
    .update(schools)
    .set({
      name,
      description: description || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      primaryColor: primaryColor || null,
      ...(logoUrl ? { logoUrl } : {}),
    })
    .where(eq(schools.id, membership.schoolId));

  // Refresca el portal (el nombre/escudo aparecen en el menú lateral).
  revalidatePath("/admin", "layout");
  return { ok: true };
}
