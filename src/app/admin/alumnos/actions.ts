"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { students, categories, teams } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { saveImage, hasUpload } from "@/lib/uploads";

export type FormState = { error?: string } | undefined;

const opt = z.string().nullish();

const schema = z.object({
  firstName: z.string().min(1, "Escribe el nombre"),
  lastName: z.string().min(1, "Escribe los apellidos"),
  birthDate: opt,
  categoryId: opt,
  teamId: opt,
  // Personales / inscripción
  sex: opt,
  nationality: opt,
  curp: opt,
  address: opt,
  city: opt,
  school: opt,
  // Deportivos
  position: opt,
  dominantFoot: opt,
  jerseySize: opt,
  // Médicos / emergencia
  bloodType: opt,
  allergies: z.string().max(500).nullish(),
  emergencyName: opt,
  emergencyPhone: opt,
  // Tutor
  guardianName: opt,
  guardianPhone: opt,
  guardianEmail: z.string().email("Correo del tutor inválido").optional().or(z.literal("")),
  notes: z.string().max(500).nullish(),
});

/** Verifica que categoría/equipo (si vienen) pertenezcan a la escuela. */
async function resolveRefs(
  schoolId: string,
  categoryId?: string | null,
  teamId?: string | null
) {
  let catId: string | null = null;
  let tmId: string | null = null;
  if (categoryId) {
    const c = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.schoolId, schoolId)),
    });
    catId = c?.id ?? null;
  }
  if (teamId) {
    const t = await db.query.teams.findFirst({
      where: and(eq(teams.id, teamId), eq(teams.schoolId, schoolId)),
    });
    tmId = t?.id ?? null;
  }
  return { categoryId: catId, teamId: tmId };
}

function parse(formData: FormData) {
  return schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    categoryId: formData.get("categoryId"),
    teamId: formData.get("teamId"),
    sex: formData.get("sex"),
    nationality: formData.get("nationality"),
    curp: formData.get("curp"),
    address: formData.get("address"),
    city: formData.get("city"),
    school: formData.get("school"),
    position: formData.get("position"),
    dominantFoot: formData.get("dominantFoot"),
    jerseySize: formData.get("jerseySize"),
    bloodType: formData.get("bloodType"),
    allergies: formData.get("allergies"),
    emergencyName: formData.get("emergencyName"),
    emergencyPhone: formData.get("emergencyPhone"),
    guardianName: formData.get("guardianName"),
    guardianPhone: formData.get("guardianPhone"),
    guardianEmail: formData.get("guardianEmail"),
    notes: formData.get("notes"),
  });
}

/** Convierte los campos opcionales del alumno en columnas (cadena vacía → null). */
function extraFields(d: z.infer<typeof schema>) {
  const n = (v: string | null | undefined) => v || null;
  return {
    sex: n(d.sex),
    nationality: n(d.nationality),
    curp: n(d.curp),
    address: n(d.address),
    city: n(d.city),
    school: n(d.school),
    position: n(d.position),
    dominantFoot: n(d.dominantFoot),
    jerseySize: n(d.jerseySize),
    bloodType: n(d.bloodType),
    allergies: n(d.allergies),
    emergencyName: n(d.emergencyName),
    emergencyPhone: n(d.emergencyPhone),
    guardianName: n(d.guardianName),
    guardianPhone: n(d.guardianPhone),
    guardianEmail: n(d.guardianEmail),
    notes: n(d.notes),
  };
}

export async function createStudent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (hasUpload(photo)) {
    try {
      photoUrl = await saveImage(photo, "alumno");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo subir la foto" };
    }
  }

  const refs = await resolveRefs(membership.schoolId, d.categoryId, d.teamId);

  await db.insert(students).values({
    schoolId: membership.schoolId,
    firstName: d.firstName,
    lastName: d.lastName,
    birthDate: d.birthDate || null,
    photoUrl: photoUrl ?? null,
    categoryId: refs.categoryId,
    teamId: refs.teamId,
    ...extraFields(d),
  });

  revalidatePath("/admin/alumnos");
  redirect("/admin/alumnos");
}

export async function updateStudent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Alumno no encontrado" };

  const current = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.schoolId, membership.schoolId)),
  });
  if (!current) return { error: "Alumno no encontrado" };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  let photoUrl = current.photoUrl;
  const photo = formData.get("photo");
  if (hasUpload(photo)) {
    try {
      photoUrl = await saveImage(photo, "alumno");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo subir la foto" };
    }
  }

  const refs = await resolveRefs(membership.schoolId, d.categoryId, d.teamId);

  await db
    .update(students)
    .set({
      firstName: d.firstName,
      lastName: d.lastName,
      birthDate: d.birthDate || null,
      photoUrl,
      categoryId: refs.categoryId,
      teamId: refs.teamId,
      ...extraFields(d),
    })
    .where(and(eq(students.id, id), eq(students.schoolId, membership.schoolId)));

  revalidatePath("/admin/alumnos");
  redirect("/admin/alumnos");
}

export async function deleteStudent(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db
      .delete(students)
      .where(and(eq(students.id, id), eq(students.schoolId, membership.schoolId)));
  }
  revalidatePath("/admin/alumnos");
}
