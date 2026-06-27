"use client";

import { useActionState } from "react";

import { createMatch, type FormState } from "./actions";
import { TextField, SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

type Option = { value: string; label: string };

function ErrorMsg({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function CreateMatchForm({
  teams,
  tournaments,
}: {
  teams: Option[];
  tournaments: Option[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createMatch,
    undefined
  );

  return (
    <form action={action} className="space-y-3">
      <SelectField
        label="Equipo"
        name="teamId"
        options={teams}
        placeholder={teams.length ? "Elige el equipo" : "Crea un equipo primero"}
        required
      />
      <TextField label="Rival" name="opponentName" placeholder="Ej. Deportivo Tonalá" />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Fecha y hora</span>
        <input type="datetime-local" name="kickoff" className={inputClass} required />
      </label>
      <SelectField
        label="Sede"
        name="isHome"
        options={[
          { value: "home", label: "Local (en casa)" },
          { value: "away", label: "Visitante" },
        ]}
        defaultValue="home"
        required
      />
      <TextField
        label="Cancha / lugar (opcional)"
        name="location"
        placeholder="Ej. Unidad Deportiva Tonalá"
        required={false}
      />
      <TextField
        label="Enlace de ubicación (opcional)"
        name="mapUrl"
        placeholder="Pega un enlace de Google Maps"
        required={false}
      />
      <TextField
        label="Uniforme requerido (opcional)"
        name="requiredUniform"
        placeholder="Ej. Jersey blanco, short azul"
        required={false}
      />
      {tournaments.length > 0 && (
        <SelectField
          label="Torneo (opcional)"
          name="tournamentId"
          options={tournaments}
          placeholder="Amistoso / sin torneo"
        />
      )}
      <ErrorMsg state={state} />
      <SubmitButton>Agendar partido</SubmitButton>
    </form>
  );
}
