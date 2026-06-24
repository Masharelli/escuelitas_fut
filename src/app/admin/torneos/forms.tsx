"use client";

import { useActionState, useEffect, useRef } from "react";

import { createTournament, addStanding, type FormState } from "./actions";
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

const FORMATS: Option[] = [
  { value: "league", label: "Liga (tabla por puntos)" },
  { value: "cup", label: "Copa / eliminatoria" },
  { value: "friendly", label: "Amistosos" },
];

const dateInput =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function CreateTournamentForm({ categories }: { categories: Option[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    createTournament,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <TextField label="Nombre del torneo" name="name" placeholder="Ej. Liga Municipal Otoño 2026" />
      <SelectField label="Formato" name="format" options={FORMATS} required />
      <SelectField
        label="Categoría (opcional)"
        name="categoryId"
        options={categories}
        placeholder={categories.length ? "Cualquier categoría" : "Crea una categoría primero"}
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
      <ErrorMsg state={state} />
      <SubmitButton>Crear torneo</SubmitButton>
    </form>
  );
}

const numCell =
  "w-14 rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function AddStandingForm({ tournamentId }: { tournamentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    addStanding,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <TextField label="Equipo" name="teamName" placeholder="Nombre del equipo (rival o el tuyo)" />
      <div className="flex flex-wrap items-end gap-3">
        <NumField label="G" name="won" />
        <NumField label="E" name="drawn" />
        <NumField label="P" name="lost" />
        <NumField label="GF" name="goalsFor" />
        <NumField label="GC" name="goalsAgainst" />
        <label className="flex items-center gap-2 pb-1.5 text-sm text-ink">
          <input type="checkbox" name="isOurs" className="h-4 w-4 rounded border-ink/30" />
          Es mi equipo
        </label>
      </div>
      <ErrorMsg state={state} />
      <SubmitButton>Agregar a la tabla</SubmitButton>
    </form>
  );
}

function NumField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <input type="number" min={0} name={name} defaultValue={0} className={numCell} />
    </label>
  );
}
