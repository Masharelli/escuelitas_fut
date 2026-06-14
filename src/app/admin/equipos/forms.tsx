"use client";

import { useActionState, useEffect, useRef } from "react";

import { createCategory, createTeam, type FormState } from "./actions";
import { TextField, SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

function ErrorMsg({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function CreateCategoryForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createCategory,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <TextField label="Nombre de la categoría" name="name" placeholder="Ej. Sub-10" />
      <TextField
        label="Año de nacimiento (opcional)"
        name="birthYear"
        type="number"
        placeholder="2015"
        required={false}
      />
      <ErrorMsg state={state} />
      <SubmitButton>Agregar categoría</SubmitButton>
    </form>
  );
}

export function CreateTeamForm({
  categories,
}: {
  categories: { value: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createTeam,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <TextField label="Nombre del equipo" name="name" placeholder="Ej. Águilas A" />
      <SelectField
        label="Categoría (opcional)"
        name="categoryId"
        options={categories}
        placeholder={categories.length ? "Sin categoría" : "Crea una categoría primero"}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Color del equipo
        </span>
        <input
          type="color"
          name="color"
          defaultValue="#0e6e37"
          className="h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-white px-1.5 shadow-sm"
        />
      </label>
      <ErrorMsg state={state} />
      <SubmitButton>Agregar equipo</SubmitButton>
    </form>
  );
}
