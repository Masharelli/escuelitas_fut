import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { staffInvitations, memberships, coachTeams } from "@/db/schema";

/**
 * Crea (o reutiliza) una invitación de entrenador para un equipo y devuelve su
 * token. Reutiliza una pendiente del mismo equipo para no duplicar enlaces.
 */
export async function createStaffInvitation(
  schoolId: string,
  teamId: string,
  email?: string | null
) {
  const e = email?.trim().toLowerCase() || null;

  const existing = await db.query.staffInvitations.findFirst({
    where: and(
      eq(staffInvitations.teamId, teamId),
      eq(staffInvitations.status, "pending")
    ),
  });
  if (existing) {
    if (e && existing.email !== e) {
      await db
        .update(staffInvitations)
        .set({ email: e })
        .where(eq(staffInvitations.id, existing.id));
      return { ...existing, email: e };
    }
    return existing;
  }

  const [created] = await db
    .insert(staffInvitations)
    .values({ schoolId, teamId, email: e })
    .returning();
  return created;
}

/** Invitación por token, con la escuela y el equipo para mostrar al coach. */
export async function getStaffInvitationByToken(token: string) {
  return db.query.staffInvitations.findFirst({
    where: eq(staffInvitations.token, token),
    with: { school: true, team: true },
  });
}

/** Invitaciones (pendientes/aceptadas) de un equipo, para la vista del admin. */
export async function getTeamStaffInvitations(teamId: string) {
  return db.query.staffInvitations.findMany({
    where: eq(staffInvitations.teamId, teamId),
    orderBy: [desc(staffInvitations.createdAt)],
    with: { acceptedBy: true },
  });
}

/**
 * Vincula al usuario como entrenador de la escuela y lo asigna al equipo de la
 * invitación. Idempotente. Devuelve el schoolId para redirigir.
 */
export async function acceptStaffInvitation(token: string, userId: string) {
  const inv = await db.query.staffInvitations.findFirst({
    where: eq(staffInvitations.token, token),
  });
  if (!inv || inv.status === "revoked") return null;

  // Membresía de entrenador (no degrada a un owner/admin existente).
  await db
    .insert(memberships)
    .values({ userId, schoolId: inv.schoolId, role: "coach" })
    .onConflictDoNothing();

  if (inv.teamId) {
    await db
      .insert(coachTeams)
      .values({ schoolId: inv.schoolId, userId, teamId: inv.teamId })
      .onConflictDoNothing();
  }

  if (inv.status !== "accepted") {
    await db
      .update(staffInvitations)
      .set({
        status: "accepted",
        acceptedByUserId: userId,
        acceptedAt: new Date(),
      })
      .where(eq(staffInvitations.id, inv.id));
  }

  return inv.schoolId;
}

/** Revoca una invitación pendiente (dentro de la escuela del admin). */
export async function revokeStaffInvitation(id: string, schoolId: string) {
  await db
    .update(staffInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(staffInvitations.id, id),
        eq(staffInvitations.schoolId, schoolId)
      )
    );
}
