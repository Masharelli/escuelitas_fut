import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { INVITATION_TTL_MS, isPendingInvitation } from "@/lib/invitation-validity";
import {
  guardianInvitations,
  guardianships,
  memberships,
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
      eq(guardianInvitations.schoolId, schoolId),
      eq(guardianInvitations.status, "pending")
    ),
  });
  if (existing) {
    if (existing.email === e && isPendingInvitation(existing)) return existing;
    // Cambiar el destinatario o renovar un enlace invalida el token anterior.
    const [renewed] = await db.update(guardianInvitations)
      .set({ email: e, token: crypto.randomUUID(), createdAt: new Date() })
      .where(and(eq(guardianInvitations.id, existing.id), eq(guardianInvitations.status, "pending")))
      .returning();
    if (renewed) return renewed;
  }

  const [created] = await db
    .insert(guardianInvitations)
    .values({ schoolId, studentId, email: e })
    .returning();
  return created;
}

/** Invitación por token, con el alumno y la escuela para mostrar al tutor. */
export async function getInvitationByToken(token: string) {
  const inv = await db.query.guardianInvitations.findFirst({
    where: eq(guardianInvitations.token, token),
    with: {
      student: { with: { category: true, team: true, tenant: true } },
    },
  });
  return inv && isPendingInvitation(inv) ? inv : null;
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
  return db.transaction(async (tx) => {
    // UPDATE condicional: dos cuentas no pueden consumir el mismo enlace.
    const [inv] = await tx.update(guardianInvitations)
      .set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() })
      .where(and(
        eq(guardianInvitations.token, token),
        eq(guardianInvitations.status, "pending"),
        gt(guardianInvitations.createdAt, new Date(Date.now() - INVITATION_TTL_MS))
      )).returning();
    if (!inv) {
      const accepted = await tx.query.guardianInvitations.findFirst({
        where: and(eq(guardianInvitations.token, token), eq(guardianInvitations.status, "accepted"), eq(guardianInvitations.acceptedByUserId, userId)),
      });
      return accepted?.studentId ?? null;
    }
    await tx.insert(guardianships).values({ userId, studentId: inv.studentId }).onConflictDoNothing();
    await tx.insert(memberships).values({ userId, schoolId: inv.schoolId, role: "parent" }).onConflictDoNothing();
    return inv.studentId;
  });
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
