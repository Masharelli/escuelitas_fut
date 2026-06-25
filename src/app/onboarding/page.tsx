"use client";

import { useActionState, useState } from "react";

import { createSchool } from "./actions";
import { AuthShell } from "@/components/auth-shell";
import { TextField } from "@/components/text-field";
import { SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";
import { LogoutButton } from "@/components/logout-button";
import { SPORT_OPTIONS } from "@/lib/sports";
import { orgVocab, type OrgKind } from "@/lib/org";

const KIND_OPTIONS: { value: OrgKind; title: string; desc: string }[] = [
  {
    value: "academy",
    title: "Escuela / academia",
    desc: "Inscribes alumnos y cobras mensualidad.",
  },
  {
    value: "league",
    title: "Liga",
    desc: "Registras equipos y organizas una temporada.",
  },
];

export default function OnboardingPage() {
  const [state, formAction] = useActionState(createSchool, undefined);
  const [kind, setKind] = useState<OrgKind>("academy");
  const vocab = orgVocab(kind);

  return (
    <AuthShell
      title={vocab.createTitle}
      subtitle={`Elige el tipo, el deporte y un nombre para tu ${vocab.noun}. Podrás cambiarlo después.`}
      topLeft={<LogoutButton />}
      footer="Después podrás configurar el resto desde el panel."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="kind" value={kind} />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            ¿Qué vas a administrar?
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {KIND_OPTIONS.map((o) => {
              const selected = kind === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setKind(o.value)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-pitch bg-pitch/[0.06] ring-2 ring-pitch/20"
                      : "border-ink/15 bg-white hover:border-pitch/40"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {o.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {o.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <SelectField
          label="Deporte"
          name="sport"
          options={SPORT_OPTIONS}
          defaultValue="futbol"
          required
        />

        <TextField
          label={`Nombre de la ${vocab.noun}`}
          name="name"
          autoComplete="organization"
          placeholder={kind === "league" ? "Ej. Liga Municipal" : "Ej. Águilas FC"}
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <SubmitButton>Crear {vocab.noun}</SubmitButton>
      </form>
    </AuthShell>
  );
}
