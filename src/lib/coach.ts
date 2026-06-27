import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { coachTeams, teams } from "@/db/schema";
import type { Role } from "@/lib/tenant";

/** Ids de los equipos que tiene asignados un entrenador en una escuela. */
export async function getCoachTeamIds(
  userId: string,
  schoolId: string
): Promise<string[]> {
  const rows = await db.query.coachTeams.findMany({
    where: and(
      eq(coachTeams.userId, userId),
      eq(coachTeams.schoolId, schoolId)
    ),
    columns: { teamId: true },
  });
  return rows.map((r) => r.teamId);
}

/** Equipos (con categoría) asignados a un entrenador, para su portal. */
export async function getCoachTeams(userId: string, schoolId: string) {
  const ids = await getCoachTeamIds(userId, schoolId);
  if (ids.length === 0) return [];
  return db.query.teams.findMany({
    where: inArray(teams.id, ids),
    with: { category: true },
    orderBy: [asc(teams.name)],
  });
}

/**
 * Garantiza que el usuario puede operar sobre `teamId`. owner/admin pueden con
 * cualquier equipo de su escuela; el coach solo con los suyos. Si no, redirige.
 */
export async function assertTeamAccess(
  membership: { role: string; userId: string; schoolId: string },
  teamId: string
): Promise<void> {
  if (membership.role === "owner" || membership.role === "admin") return;
  if (membership.role === "coach") {
    const ok = await db.query.coachTeams.findFirst({
      where: and(
        eq(coachTeams.userId, membership.userId),
        eq(coachTeams.schoolId, membership.schoolId),
        eq(coachTeams.teamId, teamId)
      ),
    });
    if (ok) return;
  }
  redirect("/coach");
}

/** ¿El rol corresponde a un entrenador (no admin/owner)? */
export function isCoach(role: Role | string): boolean {
  return role === "coach";
}

/** Entrenadores asignados a un equipo (para la UI del admin). */
export async function getTeamCoaches(teamId: string) {
  const rows = await db.query.coachTeams.findMany({
    where: eq(coachTeams.teamId, teamId),
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
  return rows.map((r) => ({ id: r.id, user: r.user }));
}

/** Quita la asignación de un entrenador a un equipo (dentro de la escuela). */
export async function removeCoachTeam(id: string, schoolId: string) {
  await db
    .delete(coachTeams)
    .where(and(eq(coachTeams.id, id), eq(coachTeams.schoolId, schoolId)));
}
