"use client";

import { useActionState } from "react";
import Link from "next/link";

import { authenticate } from "../actions";
import { AuthShell } from "@/components/auth-shell";
import { TextField } from "@/components/text-field";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(authenticate, undefined);

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entra para administrar tu escuela o seguir a tus hijos."
      backHref="/"
      backLabel="Inicio"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold text-pitch hover:text-pitch-deep"
          >
            Crea una
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
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
    </AuthShell>
  );
}
