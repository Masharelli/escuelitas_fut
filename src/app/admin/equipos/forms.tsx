"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { createCategory, createTeam, type FormState } from "./actions";
import { TextField, SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";
import { AddButtonLabel } from "@/components/ui";

type CategoryOption = { value: string; label: string };

export function TeamCreationActions({ categories, selectedCategoryId }: {
  categories: CategoryOption[];
  selectedCategoryId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <CreationDialog title="Nueva categoría" />
      <CreationDialog title="Nuevo equipo" team={{ categories, defaultCategoryId: selectedCategoryId }} />
    </div>
  );
}

function CreationDialog({ title, team }: {
  title: string;
  team?: { categories: CategoryOption[]; defaultCategoryId?: string };
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    dialog.current?.showModal();
    setOpen(true);
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={show}
        className={team ? "md-button md-filled" : "md-button md-outlined"}
      >
        <AddButtonLabel>{title}</AddButtonLabel>
      </button>
      <dialog
        id={id}
        ref={dialog}
        aria-labelledby={`${id}-titulo`}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-outline-variant bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/45 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`${id}-titulo`} className="font-display text-xl font-extrabold">{title}</h2>
          <button type="button" data-plain onClick={close} aria-label="Cerrar" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-ink-soft hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-pitch">×</button>
        </div>
        {open && (team ? <CreateTeamForm {...team} onSaved={close} /> : <CreateCategoryForm onSaved={close} />)}
      </dialog>
    </>
  );
}

function ErrorMsg({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

function CreateCategoryForm({ onSaved }: { onSaved: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(
    createCategory,
    undefined
  );
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="space-y-3">
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

function CreateTeamForm({
  categories,
  defaultCategoryId,
  onSaved,
}: {
  categories: CategoryOption[];
  defaultCategoryId?: string;
  onSaved: () => void;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createTeam,
    undefined
  );
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="space-y-3">
      <TextField label="Nombre del equipo" name="name" placeholder="Ej. Águilas A" />
      <SelectField
        label="Categoría (opcional)"
        name="categoryId"
        options={categories}
        defaultValue={defaultCategoryId}
        placeholder="Sin categoría"
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
