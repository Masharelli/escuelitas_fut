"use client";

import { useActionState } from "react";

import { authenticate } from "../actions";
import { TextField } from "@/components/text-field";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tu@correo.com"
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
      />

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}
