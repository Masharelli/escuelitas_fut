import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { matchEvents, matches, memberships, coachTeams } from "@/db/schema";

export type MatchEventType = "goal" | "goal_opponent" | "yellow" | "red";

/**
 * Devuelve el partido (con equipo) si el usuario puede capturarlo en vivo: es
 * el "papá estadístico" designado, o staff (owner/admin de la escuela, o coach
 * del equipo). Devuelve null si no tiene permiso o el partido no existe.
 */
export async function getMatchForScorekeeper(matchId: string, userId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: { team: true },
  });
  if (!match) return null;
  if (match.scorekeeperUserId === userId) return match;

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.schoolId, match.schoolId)
    ),
  });
  if (membership?.role === "owner" || membership?.role === "admin") return match;
  if (membership?.role === "coach") {
    const link = await db.query.coachTeams.findFirst({
      where: and(
        eq(coachTeams.userId, userId),
        eq(coachTeams.teamId, match.teamId)
      ),
    });
    if (link) return match;
  }
  return null;
}

/** Eventos de un partido en orden cronológico (con el alumno relacionado). */
export async function getMatchEvents(schoolId: string, matchId: string) {
  return db.query.matchEvents.findMany({
    where: and(
      eq(matchEvents.schoolId, schoolId),
      eq(matchEvents.matchId, matchId)
    ),
    with: { student: { columns: { firstName: true, lastName: true } } },
    orderBy: [asc(matchEvents.createdAt)],
  });
}

/** Marcador parcial (nuestro - rival) a partir de los goles registrados. */
export function liveScore(events: { type: string }[]) {
  let ours = 0;
  let opp = 0;
  for (const e of events) {
    if (e.type === "goal") ours++;
    else if (e.type === "goal_opponent") opp++;
  }
  return { ours, opp };
}

/** Inserta un evento y devuelve la fila creada. */
export async function addMatchEvent(values: {
  schoolId: string;
  matchId: string;
  type: MatchEventType;
  minute?: number | null;
  studentId?: string | null;
}) {
  const [created] = await db
    .insert(matchEvents)
    .values({
      schoolId: values.schoolId,
      matchId: values.matchId,
      type: values.type,
      minute: values.minute ?? null,
      studentId: values.studentId ?? null,
    })
    .returning();
  return created;
}

/** Borra un evento (dentro de la escuela). */
export async function deleteMatchEvent(id: string, schoolId: string) {
  await db
    .delete(matchEvents)
    .where(and(eq(matchEvents.id, id), eq(matchEvents.schoolId, schoolId)));
}
