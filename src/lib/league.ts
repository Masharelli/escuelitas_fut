import type { StandingsRule } from "@/lib/sports";

/**
 * Lógica de competición de LIGA (Fase L3): generación de calendario
 * (todos contra todos) y cálculo de la tabla de posiciones según el deporte.
 * Funciones puras (sin DB) para poder probarlas y reusarlas.
 */

export type Pairing = { round: number; homeId: string; awayId: string };

/**
 * Calendario de "todos contra todos" a una vuelta (método del círculo). Reparte
 * los partidos en jornadas y alterna local/visitante para que sea parejo. Con
 * número impar de equipos, cada jornada uno descansa. Devuelve los cruces con
 * su número de jornada.
 */
export function generateRoundRobin(teamIds: string[]): Pairing[] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  const BYE = "__bye__";
  if (ids.length % 2 === 1) ids.push(BYE);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];
  const pairings: Pairing[] = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) {
        // Alterna localía por jornada/posición para repartir locales y visitas.
        const aIsHome = (r + i) % 2 === 0;
        pairings.push({
          round: r + 1,
          homeId: aIsHome ? a : b,
          awayId: aIsHome ? b : a,
        });
      }
    }
    // Rota dejando fijo el primer elemento (método del círculo).
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return pairings;
}

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  for: number;
  against: number;
  diff: number;
  points: number;
  winPct: number;
};

type PlayedMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

/**
 * Tabla de posiciones calculada desde los partidos jugados, según la regla del
 * deporte: futbol ordena por puntos (3·G + 1·E) y desempata por diferencia;
 * básquet/béis/sóftbol ordenan por % de victorias. Incluye a todos los equipos
 * (los que no han jugado quedan en 0).
 */
export function computeStandings(
  teamIds: string[],
  matches: PlayedMatch[],
  rule: StandingsRule
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) {
    rows.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      for: 0,
      against: 0,
      diff: 0,
      points: 0,
      winPct: 0,
    });
  }

  for (const m of matches) {
    const h = rows.get(m.homeTeamId);
    const a = rows.get(m.awayTeamId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.for += m.homeScore;
    h.against += m.awayScore;
    a.for += m.awayScore;
    a.against += m.homeScore;
    if (m.homeScore > m.awayScore) {
      h.won++;
      a.lost++;
    } else if (m.homeScore < m.awayScore) {
      a.won++;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
    }
  }

  for (const row of rows.values()) {
    row.diff = row.for - row.against;
    row.points = row.won * rule.pointsPerWin + row.drawn * rule.pointsPerDraw;
    const decided = row.won + row.lost;
    row.winPct = decided > 0 ? row.won / decided : 0;
  }

  const list = [...rows.values()];
  list.sort((x, y) => {
    if (rule.rankBy === "points") {
      if (y.points !== x.points) return y.points - x.points;
    } else {
      if (y.winPct !== x.winPct) return y.winPct - x.winPct;
      if (y.won !== x.won) return y.won - x.won;
    }
    if (y.diff !== x.diff) return y.diff - x.diff;
    return y.for - x.for;
  });
  return list;
}

export type LeaderRow = {
  playerId: string;
  name: string;
  teamName: string;
  value: number;
};

/**
 * Líderes de una estadística (ej. goleo): suma el valor por jugador a lo largo
 * de los partidos y devuelve el top N (solo con valor > 0).
 */
export function computeLeaders(
  rows: { playerId: string; name: string; teamName: string; value: number }[],
  topN = 10
): LeaderRow[] {
  const agg = new Map<string, LeaderRow>();
  for (const r of rows) {
    const cur =
      agg.get(r.playerId) ??
      ({ playerId: r.playerId, name: r.name, teamName: r.teamName, value: 0 } as LeaderRow);
    cur.value += r.value;
    agg.set(r.playerId, cur);
  }
  return [...agg.values()]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}
