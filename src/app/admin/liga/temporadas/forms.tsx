"use client";

import { useActionState, useEffect, useRef } from "react";

import { createSeason, registerTeam, type FormState } from "./actions";
import { TextField } from "@/components/text-field";
import { SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Próxima" },
  { value: "active", label: "En curso" },
  { value: "finished", label: "Terminada" },
];

const dateInput =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function CreateSeasonForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createSeason,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <TextField label="Nombre de la temporada" name="name" placeholder="Ej. Apertura 2026" />
      <SelectField
        label="Estado"
        name="status"
        options={STATUS_OPTIONS}
        defaultValue="active"
        required
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Inicia (opcional)</span>
          <input type="date" name="startsOn" className={dateInput} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Termina (opcional)</span>
          <input type="date" name="endsOn" className={dateInput} />
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Crear temporada</SubmitButton>
    </form>
  );
}

/** Selector + botón para inscribir un equipo a una temporada. */
export function RegisterTeamForm({
  seasonId,
  options,
}: {
  seasonId: string;
  options: { value: string; label: string }[];
}) {
  if (options.length === 0) {
    return (
      <p className="text-xs text-ink-soft">
        Todos los equipos ya están inscritos en esta temporada.
      </p>
    );
  }
  return (
    <form action={registerTeam} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="seasonId" value={seasonId} />
      <select
        name="teamId"
        defaultValue=""
        required
        className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      >
        <option value="" disabled>
          Inscribir equipo…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-pitch px-3.5 py-2 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
      >
        Inscribir
      </button>
    </form>
  );
}
