"use client";

import { useActionState } from "react";
import Link from "next/link";

import { authenticate } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(authenticate, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500">
          Entra para administrar tu escuela o ver a tus hijos.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <Field label="Correo" name="email" type="email" autoComplete="email" />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
          />

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton>Entrar</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-emerald-600">
            Crear una
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
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
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
    </label>
  );
}
