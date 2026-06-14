"use client";

import { useActionState } from "react";
import Image from "next/image";

import { updateSchool, type FormState } from "./actions";
import { PageHeader, Card } from "@/components/ui";
import { TextField, TextareaField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

type School = {
  name: string;
  logoUrl: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  primaryColor: string | null;
};

export function EscuelaForm({ school }: { school: School }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateSchool,
    undefined
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Mi escuela"
        title="Perfil de la escuela"
        subtitle="Escudo, datos de contacto e información que verán los papás."
      />

      <form action={formAction} className="space-y-6">
        <Card>
          <p className="mb-4 text-sm font-semibold text-ink">Escudo</p>
          <div className="flex items-center gap-4">
            <Crest name={school.name} logoUrl={school.logoUrl} />
            <div className="min-w-0">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-pitch/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pitch hover:file:bg-pitch/15"
              />
              <p className="mt-1.5 text-xs text-ink-soft">
                PNG, JPG o WEBP, hasta 5 MB. Cuadrado se ve mejor.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label="Nombre de la escuela"
                name="name"
                defaultValue={school.name}
              />
            </div>
            <TextField
              label="Teléfono"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="55 1234 5678"
              required={false}
              defaultValue={school.phone ?? undefined}
            />
            <TextField
              label="Correo de contacto"
              name="email"
              type="email"
              placeholder="contacto@escuela.com"
              required={false}
              defaultValue={school.email ?? undefined}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Dirección"
                name="address"
                placeholder="Calle, número, colonia"
                required={false}
                defaultValue={school.address ?? undefined}
              />
            </div>
            <TextField
              label="Ciudad"
              name="city"
              required={false}
              defaultValue={school.city ?? undefined}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Color del equipo
              </span>
              <input
                type="color"
                name="primaryColor"
                defaultValue={school.primaryColor || "#0e6e37"}
                className="h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-white px-1.5 shadow-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <TextareaField
                label="Descripción"
                name="description"
                placeholder="Cuéntale a los papás sobre tu escuela…"
                rows={3}
                defaultValue={school.description ?? undefined}
              />
            </div>
          </div>
        </Card>

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p
            role="status"
            className="rounded-lg border border-pitch/20 bg-pitch/[0.06] px-3 py-2 text-sm font-medium text-pitch"
          >
            Cambios guardados.
          </p>
        )}

        <div className="sm:max-w-xs">
          <SubmitButton>Guardar cambios</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Crest({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Escudo de ${name}`}
        width={72}
        height={72}
        className="h-[72px] w-[72px] shrink-0 rounded-xl border border-ink/10 object-cover"
        unoptimized
      />
    );
  }
  return (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-pitch font-display text-2xl font-extrabold text-chalk">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
