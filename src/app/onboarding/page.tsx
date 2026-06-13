"use client";

import { useActionState } from "react";

import { createSchool } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export default function OnboardingPage() {
  const [state, formAction] = useActionState(createSchool, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Crea tu escuela</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dale un nombre a tu escuela de futbol. Podrás cambiarlo después.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de la escuela
            </span>
            <input
              name="name"
              type="text"
              required
              placeholder="Ej. Águilas FC"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton>Crear escuela</SubmitButton>
        </form>
      </div>
    </main>
  );
}
