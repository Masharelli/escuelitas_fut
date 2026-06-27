"use client";

import { saveMatchStats } from "../../../actions";
import { SubmitButton } from "@/components/submit-button";

type Player = { id: string; name: string; number: string | null; teamId: string };
type StatField = { key: string; label: string; abbrev: string };
type Team = { name: string; roster: Player[] };

const numInput =
  "w-14 rounded-lg border border-ink/15 bg-white px-1.5 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function MatchStatsForm({
  matchId,
  seasonId,
  statFields,
  home,
  away,
  homeScore,
  awayScore,
  statsByPlayer,
  scoreNoun,
}: {
  matchId: string;
  seasonId: string;
  statFields: StatField[];
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
  statsByPlayer: Record<string, Record<string, number>>;
  scoreNoun: string;
}) {
  const allPlayerIds = [...home.roster, ...away.roster].map((p) => p.id).join(",");
  const statKeys = statFields.map((s) => s.key).join(",");

  return (
    <form action={saveMatchStats} className="space-y-6">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="statKeys" value={statKeys} />
      <input type="hidden" name="playerIds" value={allPlayerIds} />

      {/* Marcador */}
      <div className="flex items-end justify-center gap-4">
        <ScoreBox label={home.name} name="homeScore" defaultValue={homeScore} scoreNoun={scoreNoun} />
        <span className="pb-2 font-display text-2xl font-bold text-ink-soft">–</span>
        <ScoreBox label={away.name} name="awayScore" defaultValue={awayScore} scoreNoun={scoreNoun} />
      </div>

      {[home, away].map((team, idx) => (
        <RosterTable
          key={idx}
          team={team}
          statFields={statFields}
          statsByPlayer={statsByPlayer}
        />
      ))}

      <SubmitButton>Guardar resultado y estadísticas</SubmitButton>
    </form>
  );
}

function RosterTable({
  team,
  statFields,
  statsByPlayer,
}: {
  team: Team;
  statFields: StatField[];
  statsByPlayer: Record<string, Record<string, number>>;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{team.name}</p>
      {team.roster.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/15 bg-white/60 px-4 py-3 text-sm text-ink-soft">
          Este equipo no tiene roster. Agrégalo en Equipos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full min-w-[320px] text-sm">
            <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Jugador</th>
                {statFields.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-center font-medium" title={s.label}>
                    {s.abbrev}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.roster.map((p) => (
                <tr key={p.id} className="border-t border-ink/10">
                  <td className="px-3 py-2 text-ink">
                    {p.number && (
                      <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded bg-chalk-deep px-1 text-xs font-bold text-ink-soft">
                        {p.number}
                      </span>
                    )}
                    {p.name}
                  </td>
                  <input type="hidden" name={`team_${p.id}`} value={p.teamId} />
                  {statFields.map((s) => (
                    <td key={s.key} className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        name={`stat_${p.id}_${s.key}`}
                        defaultValue={statsByPlayer[p.id]?.[s.key] ?? ""}
                        className={numInput}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreBox({
  label,
  name,
  defaultValue,
  scoreNoun,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  scoreNoun: string;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="max-w-[9rem] truncate text-xs font-medium text-ink-soft">
        {label}
      </span>
      <input
        type="number"
        min={0}
        name={name}
        defaultValue={defaultValue ?? 0}
        aria-label={`${scoreNoun} de ${label}`}
        className="w-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-center font-display text-2xl font-bold text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      />
    </label>
  );
}
