"use client";

import { useActionState } from "react";

import { createSession, type FormState } from "./actions";
import { TextField, SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

type Option = { value: string; label: string };

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function CreateSessionForm({ teams }: { teams: Option[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    createSession,
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
      <SelectField
        label="Tipo"
        name="kind"
        options={[
          { value: "training", label: "Entrenamiento" },
          { value: "event", label: "Evento" },
        ]}
        defaultValue="training"
        required
      />
      <TextField
        label="Título (opcional)"
        name="title"
        placeholder="Ej. Entrenamiento técnico"
        required={false}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Fecha y hora
        </span>
        <input
          type="datetime-local"
          name="startsAt"
          className={inputClass}
          required
        />
      </label>
      <TextField
        label="Lugar (opcional)"
        name="location"
        placeholder="Ej. Cancha 2"
        required={false}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Crear sesión</SubmitButton>
    </form>
  );
}
