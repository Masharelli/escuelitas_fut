"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";

import { type FormState } from "./actions";
import { Card } from "@/components/ui";
import { TextField, SelectField, TextareaField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

type Option = { value: string; label: string };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  photoUrl: string | null;
  categoryId: string | null;
  teamId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  notes: string | null;
};

export function StudentForm({
  action,
  categories,
  teams,
  student,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  teams: Option[];
  student?: Student;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      {student && <input type="hidden" name="id" value={student.id} />}

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Datos del alumno</p>
        <div className="mb-4 flex items-center gap-4">
          <Photo
            name={`${student?.firstName ?? ""}`}
            photoUrl={student?.photoUrl ?? null}
          />
          <div className="min-w-0">
            <input
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-pitch/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pitch hover:file:bg-pitch/15"
            />
            <p className="mt-1.5 text-xs text-ink-soft">Foto del alumno (opcional).</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre(s)" name="firstName" defaultValue={student?.firstName} />
          <TextField label="Apellidos" name="lastName" defaultValue={student?.lastName} />
          <TextField
            label="Fecha de nacimiento"
            name="birthDate"
            type="date"
            required={false}
            defaultValue={student?.birthDate ?? undefined}
          />
          <div className="hidden sm:block" />
          <SelectField
            label="Categoría"
            name="categoryId"
            options={categories}
            defaultValue={student?.categoryId ?? ""}
            placeholder="Sin categoría"
          />
          <SelectField
            label="Equipo"
            name="teamId"
            options={teams}
            defaultValue={student?.teamId ?? ""}
            placeholder="Sin equipo"
          />
        </div>
      </Card>

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">
          Tutor (papá / mamá)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre del tutor"
            name="guardianName"
            required={false}
            defaultValue={student?.guardianName ?? undefined}
          />
          <TextField
            label="Teléfono"
            name="guardianPhone"
            type="tel"
            required={false}
            defaultValue={student?.guardianPhone ?? undefined}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Correo del tutor"
              name="guardianEmail"
              type="email"
              required={false}
              placeholder="Para vincular su cuenta en la Fase 2"
              defaultValue={student?.guardianEmail ?? undefined}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="Notas (opcional)"
              name="notes"
              defaultValue={student?.notes ?? undefined}
              rows={2}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
        <Link
          href="/admin/alumnos"
          className="text-center text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Photo({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={72}
        height={72}
        unoptimized
        className="h-[72px] w-[72px] shrink-0 rounded-full border border-ink/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-pitch/10 text-pitch">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
