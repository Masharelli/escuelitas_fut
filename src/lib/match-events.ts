import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  matchEvents,
  matches,
  memberships,
  coachTeams,
  tournamentStandings,
} from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";
import { teamRecord } from "@/lib/competition";
import { assertStudentRoster } from "@/lib/roster";

export type MatchEventType =
  | "goal"
  | "goal_opponent"
  | "yellow"
  | "red"
  | "kick_off"
  | "half_time"
  | "second_half"
  | "full_time";

/** Eventos de fase del partido (sin jugador ni minuto obligatorio). */
export const PHASE_EVENTS: MatchEventType[] = [
  "kick_off",
  "half_time",
  "second_half",
  "full_time",
];

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
        eq(coachTeams.schoolId, match.schoolId),
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
  const match = await tenantDb(values.schoolId).matches.findById(values.matchId);
  if (!match) throw new Error("Partido no encontrado");
  await assertStudentRoster(values.schoolId, match.teamId, values.studentId ? [values.studentId] : []);
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
export async function deleteMatchEvent(id: string, schoolId: string, matchId: string) {
  await db
    .delete(matchEvents)
    .where(and(eq(matchEvents.id, id), eq(matchEvents.schoolId, schoolId), eq(matchEvents.matchId, matchId)));
}

/**
 * Finaliza el partido a partir de los eventos capturados en vivo: fija el
 * marcador y el estado "jugado", genera las estadísticas por jugador
 * (goles/tarjetas) y, si el partido pertenece a un torneo, recalcula la fila
 * de NUESTRO equipo en la tabla de posiciones (los rivales se capturan a mano
 * o con la foto de la liga).
 */
export async function finalizeMatch(match: {
  id: string;
  schoolId: string;
  teamId: string;
  tournamentId: string | null;
  team: { name: string };
}) {
  const tdb = tenantDb(match.schoolId);
  const events = await getMatchEvents(match.schoolId, match.id);
  const { ours, opp } = liveScore(events);

  await tdb.matches.updateById(match.id, {
    status: "played",
    ourScore: ours,
    opponentScore: opp,
  });

  // Estadísticas por jugador a partir de los eventos con alumno.
  const byStudent = new Map<
    string,
    { goals: number; yellowCards: number; redCards: number }
  >();
  for (const e of events) {
    if (!e.studentId) continue;
    const s = byStudent.get(e.studentId) ?? {
      goals: 0,
      yellowCards: 0,
      redCards: 0,
    };
    if (e.type === "goal") s.goals++;
    else if (e.type === "yellow") s.yellowCards++;
    else if (e.type === "red") s.redCards++;
    byStudent.set(e.studentId, s);
  }
  await tdb.matchPlayerStats.replaceForMatch(
    match.id,
    [...byStudent.entries()].map(([studentId, s]) => ({ studentId, ...s }))
  );

  if (!match.tournamentId) return;

  // Recalcula nuestra fila del torneo con TODOS los partidos jugados de este
  // equipo en ese torneo.
  const played = await tdb.matches.findMany({
    where: and(
      eq(matches.tournamentId, match.tournamentId),
      eq(matches.teamId, match.teamId)
    ),
    columns: { status: true, ourScore: true, opponentScore: true },
  });
  const r = teamRecord(played);

  const row = {
    teamName: match.team.name,
    isOurs: true,
    played: r.pj,
    won: r.w,
    drawn: r.d,
    lost: r.l,
    goalsFor: r.gf,
    goalsAgainst: r.ga,
  };
  const existing = await db.query.tournamentStandings.findFirst({
    where: and(
      eq(tournamentStandings.tournamentId, match.tournamentId),
      eq(tournamentStandings.schoolId, match.schoolId),
      eq(tournamentStandings.isOurs, true)
    ),
  });
  if (existing) {
    await tdb.tournamentStandings.updateById(existing.id, row);
  } else {
    await tdb.tournamentStandings.insert({
      tournamentId: match.tournamentId,
      ...row,
    });
  }
}
