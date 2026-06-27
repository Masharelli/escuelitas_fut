"use client";

import { addEventAction, deleteEventAction } from "./actions";

type Player = { id: string; name: string };
type Event = {
  id: string;
  type: string;
  minute: number | null;
  studentName: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  goal: "⚽ Gol",
  goal_opponent: "Gol rival",
  yellow: "🟨 Amarilla",
  red: "🟥 Roja",
};

export function LiveForm({
  matchId,
  teamName,
  opponentName,
  isHome,
  ours,
  opp,
  players,
  events,
}: {
  matchId: string;
  teamName: string;
  opponentName: string;
  isHome: boolean;
  ours: number;
  opp: number;
  players: Player[];
  events: Event[];
}) {
  const homeName = isHome ? teamName : opponentName;
  const awayName = isHome ? opponentName : teamName;
  const homeScore = isHome ? ours : opp;
  const awayScore = isHome ? opp : ours;

  const btn =
    "rounded-xl px-3 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50";

  return (
    <div className="space-y-6">
      {/* Marcador */}
      <div className="flex items-center justify-center gap-4 rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-right font-semibold text-ink">
          {homeName}
        </span>
        <span className="font-display text-3xl font-extrabold tabular-nums text-ink">
          {homeScore} - {awayScore}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">
          {awayName}
        </span>
      </div>

      {/* Captura */}
      <form className="space-y-3 rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm">
        <input type="hidden" name="matchId" value={matchId} />
        <div className="flex gap-3">
          <label className="w-24">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              Minuto
            </span>
            <input
              type="number"
              name="minute"
              min={1}
              max={130}
              placeholder="—"
              className="w-full rounded-lg border border-ink/15 bg-white px-2 py-2 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              Jugador (gol/tarjeta de {teamName})
            </span>
            <select
              name="studentId"
              defaultValue=""
              className="w-full rounded-lg border border-ink/15 bg-white px-2 py-2 text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
            >
              <option value="">Sin especificar</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            formAction={addEventAction}
            name="type"
            value="goal"
            className={`${btn} bg-pitch text-chalk hover:bg-pitch-deep`}
          >
            ⚽ Gol {teamName}
          </button>
          <button
            type="submit"
            formAction={addEventAction}
            name="type"
            value="goal_opponent"
            className={`${btn} bg-ink/80 text-chalk hover:bg-ink`}
          >
            Gol rival
          </button>
          <button
            type="submit"
            formAction={addEventAction}
            name="type"
            value="yellow"
            className={`${btn} bg-amber-400 text-ink hover:bg-amber-500`}
          >
            🟨 Amarilla
          </button>
          <button
            type="submit"
            formAction={addEventAction}
            name="type"
            value="red"
            className={`${btn} bg-red-500 text-chalk hover:bg-red-600`}
          >
            🟥 Roja
          </button>
        </div>
        <p className="text-center text-xs text-ink-soft">
          Cada registro avisa al instante a los papás del equipo.
        </p>
      </form>

      {/* Feed */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Eventos</p>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 bg-white/60 p-4 text-center text-sm text-ink-soft">
            Aún no hay eventos. Registra el primero arriba.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {[...events].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-3.5 py-2 text-sm shadow-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">
                    {EVENT_LABEL[e.type] ?? e.type}
                  </span>
                  {e.minute ? (
                    <span className="text-ink-soft"> · min {e.minute}</span>
                  ) : null}
                  {e.studentName ? (
                    <span className="text-ink-soft"> · {e.studentName}</span>
                  ) : null}
                </span>
                <form action={deleteEventAction}>
                  <input type="hidden" name="matchId" value={matchId} />
                  <input type="hidden" name="eventId" value={e.id} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
