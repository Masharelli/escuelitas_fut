"use client";

import { useActionState } from "react";
import Link from "next/link";

import { registerUser } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default function RegistroPage() {
  const [state, formAction] = useActionState(registerUser, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Regístrate para empezar a usar la plataforma.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <Field label="Nombre completo" name="name" type="text" />
          <Field label="Correo" name="email" type="email" autoComplete="email" />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="Mínimo 8 caracteres"
          />

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton>Crear cuenta</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-emerald-600">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
