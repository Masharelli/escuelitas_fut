import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { coachTeams, memberships, teams, users } from "@/db/schema";
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
    where: and(eq(teams.schoolId, schoolId), inArray(teams.id, ids)),
    with: { category: true },
    orderBy: [asc(teams.name)],
  });
}

/** Asigna una cuenta que ya es entrenadora de esta escuela a otro equipo. */
export async function assignExistingCoach(schoolId: string, teamId: string, email: string) {
  const assigned = await db.insert(coachTeams).select(
    db.select({
      id: sql<string>`gen_random_uuid()::text`.as("id"),
      schoolId: teams.schoolId,
      userId: users.id,
      teamId: teams.id,
      createdAt: sql<Date>`now()`.as("created_at"),
    }).from(teams)
      .innerJoin(memberships, and(
        eq(memberships.schoolId, teams.schoolId),
        eq(memberships.role, "coach"),
      ))
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(teams.id, teamId), eq(teams.schoolId, schoolId), sql`lower(${users.email}) = ${email}`)),
  ).onConflictDoNothing().returning({ id: coachTeams.id });
  if (assigned.length) return true;
  const existing = await db.select({ id: coachTeams.id }).from(coachTeams)
    .innerJoin(users, eq(users.id, coachTeams.userId))
    .where(and(eq(coachTeams.schoolId, schoolId), eq(coachTeams.teamId, teamId), sql`lower(${users.email}) = ${email}`));
  return existing.length > 0;
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
