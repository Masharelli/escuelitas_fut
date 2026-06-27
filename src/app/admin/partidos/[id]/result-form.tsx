"use client";

import { useActionState } from "react";

import { saveResult, type FormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";

type Player = {
  id: string;
  name: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
};

const numInput =
  "w-16 rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function ResultForm({
  matchId,
  opponentName,
  ourScore,
  opponentScore,
  players,
}: {
  matchId: string;
  opponentName: string;
  ourScore: number | null;
  opponentScore: number | null;
  players: Player[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveResult,
    undefined
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="hidden"
        name="studentIds"
        value={players.map((p) => p.id).join(",")}
      />

      <div className="flex items-end justify-center gap-4">
        <ScoreBox label="Nosotros" name="ourScore" defaultValue={ourScore} />
        <span className="pb-2 font-display text-2xl font-bold text-ink-soft">
          -
        </span>
        <ScoreBox
          label={opponentName}
          name="opponentScore"
          defaultValue={opponentScore}
        />
      </div>

      {players.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">
            Estadísticas de jugadores
          </p>
          <div className="overflow-x-auto rounded-xl border border-ink/10">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Jugador</th>
                  <th className="px-2 py-2 text-center font-medium">Goles</th>
                  <th className="px-2 py-2 text-center font-medium">Asist.</th>
                  <th className="px-2 py-2 text-center font-medium" title="Tarjetas amarillas">🟨</th>
                  <th className="px-2 py-2 text-center font-medium" title="Tarjetas rojas">🟥</th>
                  <th className="px-2 py-2 text-center font-medium">Min.</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-ink/10">
                    <td className="px-3 py-2 text-ink">{p.name}</td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        name={`goals_${p.id}`}
                        defaultValue={p.goals}
                        className={numInput}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        name={`assists_${p.id}`}
                        defaultValue={p.assists}
                        className={numInput}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={2}
                        name={`yellow_${p.id}`}
                        defaultValue={p.yellowCards}
                        className={numInput}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        name={`red_${p.id}`}
                        defaultValue={p.redCards}
                        className={numInput}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        name={`min_${p.id}`}
                        defaultValue={p.minutesPlayed}
                        className={numInput}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state?.ok && <p className="text-sm text-pitch">Resultado guardado ✓</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Guardar resultado</SubmitButton>
    </form>
  );
}

function ScoreBox({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="max-w-[8rem] truncate text-xs font-medium text-ink-soft">
        {label}
      </span>
      <input
        type="number"
        min={0}
        name={name}
        defaultValue={defaultValue ?? 0}
        className="w-20 rounded-xl border border-ink/15 bg-white px-3 py-2 text-center font-display text-2xl font-bold text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      />
    </label>
  );
}
