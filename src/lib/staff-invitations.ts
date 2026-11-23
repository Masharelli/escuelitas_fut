import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { INVITATION_TTL_MS, isPendingInvitation } from "@/lib/invitation-validity";
import { staffInvitations, memberships, coachTeams, users } from "@/db/schema";

/**
 * Crea (o reutiliza) una invitación de entrenador para un equipo y devuelve su
 * token. Reutiliza una pendiente del mismo equipo para no duplicar enlaces.
 */
export async function createStaffInvitation(
  schoolId: string,
  teamId: string | null,
  email: string,
  role: "coach" | "admin" = "coach"
) {
  const parsedEmail = z.email().safeParse(typeof email === "string" ? email.trim().toLowerCase() : "");
  if (!parsedEmail.success) throw new Error("Escribe un correo válido para la invitación.");
  const e = parsedEmail.data;

  const existing = await db.query.staffInvitations.findFirst({
    where: and(
      teamId ? eq(staffInvitations.teamId, teamId) : isNull(staffInvitations.teamId),
      eq(staffInvitations.role, role),
      ...(role === "admin" ? [eq(staffInvitations.email, e)] : []),
      eq(staffInvitations.schoolId, schoolId),
      eq(staffInvitations.status, "pending")
    ),
  });
  if (existing) {
    if (existing.email === e && isPendingInvitation(existing)) return existing;
    // Cambiar el destinatario o renovar un enlace invalida el token anterior.
    const [renewed] = await db.update(staffInvitations)
      .set({ email: e, token: crypto.randomUUID(), createdAt: new Date() })
      .where(and(eq(staffInvitations.id, existing.id), eq(staffInvitations.status, "pending")))
      .returning();
    if (renewed) return renewed;
  }

  const [created] = await db
    .insert(staffInvitations)
    .values({ schoolId, teamId, email: e, role })
    .returning();
  return created;
}

/** Invitación por token, con la escuela y el equipo para mostrar al coach. */
export async function getStaffInvitationByToken(token: string) {
  const inv = await db.query.staffInvitations.findFirst({
    where: eq(staffInvitations.token, token),
    with: { school: true, team: true },
  });
  return inv?.email?.trim() && isPendingInvitation(inv) ? inv : null;
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
  return db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    });
    if (!user) return null;
    const recipient = sql`lower(trim(${staffInvitations.email})) = ${user.email.trim().toLowerCase()}`;
    // UPDATE condicional: dos cuentas no pueden consumir el mismo enlace.
    const [inv] = await tx.update(staffInvitations)
      .set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() })
      .where(and(
        eq(staffInvitations.token, token),
        recipient,
        eq(staffInvitations.status, "pending"),
        gt(staffInvitations.createdAt, new Date(Date.now() - INVITATION_TTL_MS))
      )).returning();
    if (!inv) {
      const accepted = await tx.query.staffInvitations.findFirst({
        where: and(eq(staffInvitations.token, token), recipient, eq(staffInvitations.status, "accepted"), eq(staffInvitations.acceptedByUserId, userId)),
      });
      return accepted?.schoolId ?? null;
    }
    await tx.insert(memberships).values({ userId, schoolId: inv.schoolId, role: inv.role })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.schoolId],
        set: { role: inv.role },
        setWhere: inArray(memberships.role, inv.role === "admin" ? ["parent", "coach"] : ["parent"]),
      });
    if (inv.teamId) {
      await tx.insert(coachTeams).values({ schoolId: inv.schoolId, userId, teamId: inv.teamId }).onConflictDoNothing();
    }
    return inv.schoolId;
  });
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
