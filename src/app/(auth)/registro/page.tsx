"use client";

import { useActionState } from "react";
import Link from "next/link";

import { registerUser } from "../actions";
import { AuthShell } from "@/components/auth-shell";
import { TextField } from "@/components/text-field";
import { SubmitButton } from "@/components/submit-button";

export default function RegistroPage() {
  const [state, formAction] = useActionState(registerUser, undefined);

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate para poner en orden tu escuela de futbol."
      backHref="/"
      backLabel="Inicio"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-pitch hover:text-pitch-deep"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <TextField label="Nombre completo" name="name" autoComplete="name" />
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
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <SubmitButton>Crear cuenta</SubmitButton>
      </form>
    </AuthShell>
  );
}
