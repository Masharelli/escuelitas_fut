"use client";

import { useActionState } from "react";

import { createExpense, type FormState } from "./actions";
import { TextField, SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/finance";

type Option = { value: string; label: string };

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function CreateExpenseForm({ categories }: { categories: Option[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    createExpense,
    undefined
  );

  return (
    <form action={action} className="space-y-3">
      <SelectField
        label="Tipo de gasto"
        name="category"
        options={EXPENSE_CATEGORY_OPTIONS}
        defaultValue="nomina"
        required
      />
      <TextField
        label="Descripción"
        name="description"
        placeholder="Ej. Pago quincenal entrenador Juan"
      />
      <TextField label="Monto (MXN)" name="amount" placeholder="Ej. 3500" />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Fecha</span>
        <input type="date" name="spentOn" className={inputClass} required />
      </label>
      {categories.length > 0 && (
        <SelectField
          label="Categoría (opcional)"
          name="categoryId"
          options={categories}
          placeholder="Sin categoría / general"
        />
      )}
      <TextField
        label="Notas (opcional)"
        name="notes"
        placeholder="Detalle adicional"
        required={false}
      />
      {state?.ok && <p className="text-sm text-pitch">Gasto registrado ✓</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Registrar gasto</SubmitButton>
    </form>
  );
}
