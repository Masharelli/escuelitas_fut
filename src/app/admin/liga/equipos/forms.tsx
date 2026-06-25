"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createLeagueTeam,
  addRosterPlayer,
  type FormState,
} from "./actions";
import { TextField } from "@/components/text-field";
import { SubmitButton } from "@/components/submit-button";

function ErrorMsg({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function CreateLeagueTeamForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createLeagueTeam,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <TextField label="Nombre del equipo" name="name" placeholder="Ej. Real Toluca" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Responsable (opcional)" name="managerName" placeholder="Capitán / delegado" />
        <TextField label="Teléfono (opcional)" name="managerPhone" placeholder="55 1234 5678" />
      </div>
      <TextField label="Correo del responsable (opcional)" name="managerEmail" placeholder="correo@ejemplo.com" />
      <label className="flex items-center gap-3 text-sm text-ink">
        <span className="font-medium">Color</span>
        <input
          type="color"
          name="color"
          defaultValue="#0E6E37"
          className="h-9 w-12 cursor-pointer rounded-lg border border-ink/15 bg-white p-1"
        />
      </label>
      <ErrorMsg state={state} />
      <SubmitButton>Agregar equipo</SubmitButton>
    </form>
  );
}

export function AddPlayerForm({ teamId }: { teamId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    addRosterPlayer,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <label className="flex-1 text-xs text-ink-soft">
        <span className="mb-1 block">Jugador</span>
        <input
          name="name"
          placeholder="Nombre"
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
      </label>
      <label className="w-20 text-xs text-ink-soft">
        <span className="mb-1 block">Dorsal</span>
        <input
          name="number"
          placeholder="10"
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-center text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
      </label>
      <label className="w-32 text-xs text-ink-soft">
        <span className="mb-1 block">Posición (opc.)</span>
        <input
          name="position"
          placeholder="—"
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
      </label>
      <SubmitButton>Agregar</SubmitButton>
      <div className="w-full">
        <ErrorMsg state={state} />
      </div>
    </form>
  );
}
