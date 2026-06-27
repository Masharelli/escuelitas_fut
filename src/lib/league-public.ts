import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  seasons,
  seasonTeams,
  leagueMatches,
  leagueMatchStats,
} from "@/db/schema";

/**
 * Lecturas PÚBLICAS de liga (Fase L6) para el portal `/e/[slug]`. Todo se filtra
 * por el `schoolId` de la liga (resuelto desde el slug), sin datos sensibles.
 */

/** Temporadas de la liga (más recientes primero). */
export async function getPublicSeasons(schoolId: string) {
  return db.query.seasons.findMany({
    where: eq(seasons.schoolId, schoolId),
    columns: {
      id: true,
      name: true,
      status: true,
      startsOn: true,
      endsOn: true,
    },
    orderBy: [desc(seasons.createdAt)],
  });
}

/** Datos completos de una temporada: equipos, partidos y estadísticas. */
export async function getPublicSeasonData(schoolId: string, seasonId: string) {
  const season = await db.query.seasons.findFirst({
    where: and(eq(seasons.id, seasonId), eq(seasons.schoolId, schoolId)),
    columns: { id: true, name: true, status: true },
  });
  if (!season) return null;

  const [teams, matches] = await Promise.all([
    db.query.seasonTeams.findMany({
      where: and(
        eq(seasonTeams.seasonId, seasonId),
        eq(seasonTeams.schoolId, schoolId)
      ),
      with: { team: true },
    }),
    db.query.leagueMatches.findMany({
      where: and(
        eq(leagueMatches.seasonId, seasonId),
        eq(leagueMatches.schoolId, schoolId)
      ),
      with: { homeTeam: true, awayTeam: true },
      orderBy: [asc(leagueMatches.round)],
    }),
  ]);

  const matchIds = matches.map((m) => m.id);
  const stats =
    matchIds.length > 0
      ? await db.query.leagueMatchStats.findMany({
          where: and(
            eq(leagueMatchStats.schoolId, schoolId),
            inArray(leagueMatchStats.matchId, matchIds)
          ),
          with: { player: { columns: { id: true, name: true } } },
        })
      : [];

  return { season, teams, matches, stats };
}
