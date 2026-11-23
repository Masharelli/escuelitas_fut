"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { coachTeams, memberships, teams } from "@/db/schema";
import { requireRole, OWNER_ROLES } from "@/lib/tenant";
import { createStaffInvitation, revokeStaffInvitation } from "@/lib/staff-invitations";
import { recordActivity } from "@/lib/activity";

export type UserState = { error?: string; ok?: boolean } | undefined;
export async function inviteStaff(_prev: UserState, formData: FormData): Promise<UserState> {
  const { membership, session } = await requireRole(OWNER_ROLES);
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Escribe un correo válido." };
  const role = z.enum(["admin", "coach"]).safeParse(formData.get("role"));
  if (!role.success) return { error: "Selecciona administrador o entrenador." };
  let teamId: string | null = null;
  if (role.data === "coach") {
    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, String(formData.get("teamId") ?? "")), eq(teams.schoolId, membership.schoolId)),
      columns: { id: true },
    });
    if (!team) return { error: "Selecciona un equipo de esta escuela." };
    teamId = team.id;
  }
  return recordActivity(membership, session.user.name, role.data === "coach" ? "Invitar entrenador" : "Invitar administrador", formData, async () => {
    await createStaffInvitation(membership.schoolId, teamId, email.data, role.data);
    revalidatePath("/admin/usuarios");
    if (teamId) revalidatePath(`/admin/equipos/${teamId}`);
    return { ok: true };
  });
}
export async function revokeUserInvitation(formData: FormData) {
  const { membership, session } = await requireRole(OWNER_ROLES);
  return recordActivity(membership, session.user.name, "Revocar invitación de personal", formData, async () => {
    await revokeStaffInvitation(String(formData.get("id") ?? ""), membership.schoolId);
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/equipos/[teamId]", "page");
  });
}

export async function grantStaffAdministration(formData: FormData) {
  const { membership, session } = await requireRole(OWNER_ROLES);
  return recordActivity(membership, session.user.name, "Otorgar administración a entrenador", formData, async () => {
    await db.update(memberships).set({ role: "admin", alsoCoach: true }).where(and(
      eq(memberships.id, String(formData.get("id") ?? "")),
      eq(memberships.schoolId, membership.schoolId),
      eq(memberships.role, "coach"),
    ));
    revalidatePath("/admin/usuarios");
    revalidatePath("/coach", "layout");
  });
}

export async function removeStaffAccess(formData: FormData) {
  const { membership, session } = await requireRole(OWNER_ROLES);
  const requested = formData.get("role");
  if (requested !== null && requested !== "admin" && requested !== "coach") return;
  const action = requested === "admin" ? "Retirar administración"
    : requested === "coach" ? "Retirar acceso de entrenador" : "Retirar acceso de personal";
  return recordActivity(membership, session.user.name, action, formData, async () => {
    await db.transaction(async (tx) => {
      const scope = and(
        eq(memberships.id, String(formData.get("id") ?? "")),
        eq(memberships.schoolId, membership.schoolId),
        inArray(memberships.role, ["admin", "coach"]),
      );
      const [staff] = await tx.select().from(memberships).where(scope).for("update");
      if (!staff) return;
      if (staff.role === "admin" && staff.alsoCoach && requested === "admin") {
        await tx.update(memberships).set({ role: "coach", alsoCoach: false }).where(scope);
        return;
      }
      if (staff.role === "admin" && staff.alsoCoach && requested === "coach") {
        await tx.update(memberships).set({ alsoCoach: false }).where(scope);
      } else if (!requested || staff.role === requested) {
        await tx.delete(memberships).where(scope);
      } else return;
      await tx.delete(coachTeams).where(and(eq(coachTeams.userId, staff.userId), eq(coachTeams.schoolId, membership.schoolId)));
    });
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/equipos/[teamId]", "page");
    revalidatePath("/coach", "layout");
  });
}
