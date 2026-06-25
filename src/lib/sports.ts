/**
 * Catálogo de deportes (cimientos multideporte, Fase L1).
 *
 * Cada deporte define:
 *  - cómo se llama y su emoji,
 *  - sus estadísticas por jugador (para la captura de resultados — Fase L5),
 *  - su regla de tabla de posiciones: si hay empates y cómo se ordena/puntúa
 *    (para la tabla de liga — Fase L3).
 *
 * Por ahora es SOLO configuración: el módulo de competición actual (futbol)
 * sigue funcionando igual; las fases L3/L5 consumirán este catálogo.
 */

export type Sport = "futbol" | "beisbol" | "softbol" | "basquetbol";

export const SPORTS: Sport[] = ["futbol", "beisbol", "softbol", "basquetbol"];

/** Una estadística por jugador (clave en DB, etiqueta y abreviatura en UI). */
export type StatField = { key: string; label: string; abbrev: string };

/**
 * Cómo se arma la tabla de posiciones de un deporte.
 *  - hasDraws: ¿existe el empate? (futbol sí; basket no; beis casi nunca)
 *  - pointsPerWin/Draw: puntos para ordenar (cuando se usa sistema de puntos)
 *  - rankBy: criterio principal de ordenamiento de la tabla
 *      "points"  → futbol (3·G + 1·E, desempata por diferencia de goles)
 *      "winPct"  → basket/beis/softbol (porcentaje de victorias)
 */
export type StandingsRule = {
  hasDraws: boolean;
  pointsPerWin: number;
  pointsPerDraw: number;
  rankBy: "points" | "winPct";
};

export type SportConfig = {
  sport: Sport;
  label: string;
  emoji: string;
  /** Cómo se le dice al puntaje del partido en este deporte. */
  scoreNoun: string;
  playerStats: StatField[];
  standings: StandingsRule;
};

export const SPORT_CONFIG: Record<Sport, SportConfig> = {
  futbol: {
    sport: "futbol",
    label: "Fútbol",
    emoji: "⚽",
    scoreNoun: "goles",
    playerStats: [
      { key: "goals", label: "Goles", abbrev: "G" },
      { key: "assists", label: "Asistencias", abbrev: "A" },
    ],
    standings: {
      hasDraws: true,
      pointsPerWin: 3,
      pointsPerDraw: 1,
      rankBy: "points",
    },
  },
  beisbol: {
    sport: "beisbol",
    label: "Béisbol",
    emoji: "⚾",
    scoreNoun: "carreras",
    playerStats: [
      { key: "runs", label: "Carreras", abbrev: "C" },
      { key: "hits", label: "Hits", abbrev: "H" },
      { key: "rbi", label: "Carreras impulsadas", abbrev: "CI" },
    ],
    standings: {
      hasDraws: false,
      pointsPerWin: 0,
      pointsPerDraw: 0,
      rankBy: "winPct",
    },
  },
  softbol: {
    sport: "softbol",
    label: "Sóftbol",
    emoji: "🥎",
    scoreNoun: "carreras",
    playerStats: [
      { key: "runs", label: "Carreras", abbrev: "C" },
      { key: "hits", label: "Hits", abbrev: "H" },
      { key: "rbi", label: "Carreras impulsadas", abbrev: "CI" },
    ],
    standings: {
      hasDraws: false,
      pointsPerWin: 0,
      pointsPerDraw: 0,
      rankBy: "winPct",
    },
  },
  basquetbol: {
    sport: "basquetbol",
    label: "Básquetbol",
    emoji: "🏀",
    scoreNoun: "puntos",
    playerStats: [
      { key: "points", label: "Puntos", abbrev: "PTS" },
      { key: "rebounds", label: "Rebotes", abbrev: "REB" },
      { key: "assists", label: "Asistencias", abbrev: "AST" },
    ],
    standings: {
      hasDraws: false,
      pointsPerWin: 0,
      pointsPerDraw: 0,
      rankBy: "winPct",
    },
  },
};

export function sportConfig(sport: Sport): SportConfig {
  return SPORT_CONFIG[sport] ?? SPORT_CONFIG.futbol;
}

/** Opciones para un <select> de deporte. */
export const SPORT_OPTIONS: { value: Sport; label: string }[] = SPORTS.map(
  (s) => ({ value: s, label: `${SPORT_CONFIG[s].emoji} ${SPORT_CONFIG[s].label}` })
);

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && (SPORTS as string[]).includes(value);
}
