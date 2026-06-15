import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  guardianInvitations,
  guardianships,
  memberships,
  students,
} from "@/db/schema";

/**
 * Crea una invitación de tutor para un alumno y devuelve su token. Reutiliza
 * una invitación pendiente si ya existe para el mismo correo, para no generar
 * enlaces duplicados al volver a pulsar el botón.
 */
export async function createInvitation(
  schoolId: string,
  studentId: string,
  email?: string | null
) {
  const e = email?.trim().toLowerCase() || null;

  const existing = await db.query.guardianInvitations.findFirst({
    where: and(
      eq(guardianInvitations.studentId, studentId),
      eq(guardianInvitations.status, "pending")
    ),
  });
  if (existing) {
    // Mantén el correo de referencia al día si el admin lo cambió.
    if (e && existing.email !== e) {
      await db
        .update(guardianInvitations)
        .set({ email: e })
        .where(eq(guardianInvitations.id, existing.id));
      return { ...existing, email: e };
    }
    return existing;
  }

  const [created] = await db
    .insert(guardianInvitations)
    .values({ schoolId, studentId, email: e })
    .returning();
  return created;
}

/** Invitación por token, con el alumno y la escuela para mostrar al tutor. */
export async function getInvitationByToken(token: string) {
  return db.query.guardianInvitations.findFirst({
    where: eq(guardianInvitations.token, token),
    with: {
      student: { with: { category: true, team: true, tenant: true } },
    },
  });
}

/** Invitaciones de un alumno (más recientes primero) para la vista de admin. */
export async function getStudentInvitations(studentId: string) {
  return db.query.guardianInvitations.findMany({
    where: eq(guardianInvitations.studentId, studentId),
    orderBy: [desc(guardianInvitations.createdAt)],
    with: { acceptedBy: true },
  });
}

/**
 * Vincula al usuario con el alumno de la invitación y le da membresía de
 * "padre" en la escuela. Idempotente. Devuelve el `studentId` para redirigir.
 */
export async function acceptInvitation(token: string, userId: string) {
  const inv = await db.query.guardianInvitations.findFirst({
    where: eq(guardianInvitations.token, token),
  });
  if (!inv || inv.status === "revoked") return null;

  await db
    .insert(guardianships)
    .values({ userId, studentId: inv.studentId })
    .onConflictDoNothing();

  await db
    .insert(memberships)
    .values({ userId, schoolId: inv.schoolId, role: "parent" })
    .onConflictDoNothing();

  if (inv.status !== "accepted") {
    await db
      .update(guardianInvitations)
      .set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() })
      .where(eq(guardianInvitations.id, inv.id));
  }

  return inv.studentId;
}

/** Revoca una invitación pendiente (sólo dentro de la escuela del admin). */
export async function revokeInvitation(id: string, schoolId: string) {
  await db
    .update(guardianInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(guardianInvitations.id, id),
        eq(guardianInvitations.schoolId, schoolId)
      )
    );
}

/** Tutores ya vinculados a un alumno (usuarios con guardianship). */
export async function getLinkedGuardians(studentId: string) {
  const rows = await db.query.guardianships.findMany({
    where: eq(guardianships.studentId, studentId),
    with: { user: true },
  });
  return rows.map((r) => r.user);
}
