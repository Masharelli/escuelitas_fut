"use client";

import { useActionState } from "react";

import { createSchool } from "./actions";
import { AuthShell } from "@/components/auth-shell";
import { TextField } from "@/components/text-field";
import { SubmitButton } from "@/components/submit-button";
import { LogoutButton } from "@/components/logout-button";

export default function OnboardingPage() {
  const [state, formAction] = useActionState(createSchool, undefined);

  return (
    <AuthShell
      title="Crea tu escuela"
      subtitle="Dale un nombre a tu escuela de futbol. Podrás cambiarlo después."
      topLeft={<LogoutButton />}
      footer="Después podrás registrar equipos, alumnos y partidos."
    >
      <form action={formAction} className="space-y-4">
        <TextField
          label="Nombre de la escuela"
          name="name"
          autoComplete="organization"
          placeholder="Ej. Águilas FC"
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <SubmitButton>Crear escuela</SubmitButton>
      </form>
    </AuthShell>
  );
}
