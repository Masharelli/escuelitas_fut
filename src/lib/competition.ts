export type MatchStatus = "scheduled" | "played" | "canceled" | "postponed";

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Programado",
  played: "Jugado",
  canceled: "Cancelado",
  postponed: "Pospuesto",
};

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  friendly: "Amistosos",
};

/** Fecha/hora de un partido → "vie 20 jun, 10:00". */
export function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Valor para un <input type="datetime-local"> a partir de una fecha. */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Played = {
  status: string;
  ourScore: number | null;
  opponentScore: number | null;
};

export type TeamRecord = {
  pj: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

/** Récord del equipo a partir de sus partidos jugados (PJ, G/E/P, goles, pts). */
export function teamRecord(matches: Played[]): TeamRecord {
  const r: TeamRecord = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  for (const m of matches) {
    if (m.status !== "played" || m.ourScore == null || m.opponentScore == null) {
      continue;
    }
    r.pj++;
    r.gf += m.ourScore;
    r.ga += m.opponentScore;
    if (m.ourScore > m.opponentScore) r.w++;
    else if (m.ourScore === m.opponentScore) r.d++;
    else r.l++;
  }
  r.gd = r.gf - r.ga;
  r.pts = r.w * 3 + r.d;
  return r;
}

/** "2 - 1" o "—" si aún no se juega. */
export function scoreLabel(
  ourScore: number | null,
  opponentScore: number | null
): string {
  if (ourScore == null || opponentScore == null) return "—";
  return `${ourScore} - ${opponentScore}`;
}

/** Resultado desde nuestra perspectiva: "win" | "draw" | "loss" | null. */
export function resultOf(
  ourScore: number | null,
  opponentScore: number | null
): "win" | "draw" | "loss" | null {
  if (ourScore == null || opponentScore == null) return null;
  if (ourScore > opponentScore) return "win";
  if (ourScore === opponentScore) return "draw";
  return "loss";
}
