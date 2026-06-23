"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { saveImage, hasUpload } from "@/lib/uploads";
import { createInvitation, revokeInvitation } from "@/lib/invitations";

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
  tdb: ReturnType<typeof tenantDb>,
  categoryId?: string | null,
  teamId?: string | null
) {
  let catId: string | null = null;
  let tmId: string | null = null;
  if (categoryId) {
    catId = (await tdb.categories.findById(categoryId))?.id ?? null;
  }
  if (teamId) {
    tmId = (await tdb.teams.findById(teamId))?.id ?? null;
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

  const tdb = tenantDb(membership.schoolId);
  const refs = await resolveRefs(tdb, d.categoryId, d.teamId);

  await tdb.students.insert({
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

  const tdb = tenantDb(membership.schoolId);
  const current = await tdb.students.findById(id);
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

  const refs = await resolveRefs(tdb, d.categoryId, d.teamId);

  await tdb.students.updateById(id, {
    firstName: d.firstName,
    lastName: d.lastName,
    birthDate: d.birthDate || null,
    photoUrl,
    categoryId: refs.categoryId,
    teamId: refs.teamId,
    ...extraFields(d),
  });

  revalidatePath("/admin/alumnos");
  redirect("/admin/alumnos");
}

/** Genera (o reutiliza) un enlace de invitación de tutor para el alumno. */
export async function inviteGuardian(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return;

  const student = await tenantDb(membership.schoolId).students.findById(
    studentId
  );
  if (!student) return;

  await createInvitation(membership.schoolId, studentId, student.guardianEmail);
  revalidatePath(`/admin/alumnos/${studentId}`);
}

/** Revoca una invitación de tutor pendiente. */
export async function revokeGuardianInvitation(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("invitationId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (id) {
    await revokeInvitation(id, membership.schoolId);
    revalidatePath(`/admin/alumnos/${studentId}`);
  }
}

export async function deleteStudent(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).students.deleteById(id);
  }
  revalidatePath("/admin/alumnos");
}
