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
  sex: string | null;
  nationality: string | null;
  curp: string | null;
  address: string | null;
  city: string | null;
  school: string | null;
  position: string | null;
  dominantFoot: string | null;
  jerseySize: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  notes: string | null;
};

const SEX_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
];
const FOOT_OPTIONS = [
  { value: "derecho", label: "Derecho" },
  { value: "izquierdo", label: "Izquierdo" },
  { value: "ambidiestro", label: "Ambidiestro" },
];
const POSITION_OPTIONS = [
  { value: "portero", label: "Portero" },
  { value: "defensa", label: "Defensa" },
  { value: "mediocampista", label: "Mediocampista" },
  { value: "delantero", label: "Delantero" },
];
const SIZE_OPTIONS = ["4", "6", "8", "10", "12", "14", "16", "Ad. S", "Ad. M", "Ad. L"].map(
  (s) => ({ value: s, label: s })
);

export function StudentForm({
  action,
  categories,
  teams,
  student,
  submitLabel,
  defaultCategoryId,
  defaultTeamId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  teams: Option[];
  student?: Student;
  submitLabel: string;
  defaultCategoryId?: string;
  defaultTeamId?: string;
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
          <SelectField
            label="Sexo"
            name="sex"
            options={SEX_OPTIONS}
            defaultValue={student?.sex ?? ""}
            placeholder="Selecciona…"
          />
          <TextField
            label="Nacionalidad"
            name="nationality"
            required={false}
            placeholder="Mexicana"
            defaultValue={student?.nationality ?? undefined}
          />
          <TextField
            label="CURP"
            name="curp"
            required={false}
            placeholder="(opcional)"
            defaultValue={student?.curp ?? undefined}
          />
          <SelectField
            label="Categoría"
            name="categoryId"
            options={categories}
            defaultValue={student?.categoryId ?? defaultCategoryId ?? ""}
            placeholder="Sin categoría"
          />
          <SelectField
            label="Equipo"
            name="teamId"
            options={teams}
            defaultValue={student?.teamId ?? defaultTeamId ?? ""}
            placeholder="Sin equipo"
          />
        </div>
      </Card>

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Dirección y escuela</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Dirección"
              name="address"
              required={false}
              placeholder="Calle, número, colonia"
              defaultValue={student?.address ?? undefined}
            />
          </div>
          <TextField
            label="Ciudad"
            name="city"
            required={false}
            defaultValue={student?.city ?? undefined}
          />
          <TextField
            label="Colegio donde estudia"
            name="school"
            required={false}
            defaultValue={student?.school ?? undefined}
          />
        </div>
      </Card>

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Datos deportivos</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Posición"
            name="position"
            options={POSITION_OPTIONS}
            defaultValue={student?.position ?? ""}
            placeholder="Selecciona…"
          />
          <SelectField
            label="Pie dominante"
            name="dominantFoot"
            options={FOOT_OPTIONS}
            defaultValue={student?.dominantFoot ?? ""}
            placeholder="Selecciona…"
          />
          <SelectField
            label="Talla de uniforme"
            name="jerseySize"
            options={SIZE_OPTIONS}
            defaultValue={student?.jerseySize ?? ""}
            placeholder="Selecciona…"
          />
        </div>
      </Card>

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Salud y emergencia</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tipo de sangre"
            name="bloodType"
            required={false}
            placeholder="Ej. O+"
            defaultValue={student?.bloodType ?? undefined}
          />
          <div className="hidden sm:block" />
          <div className="sm:col-span-2">
            <TextareaField
              label="Alergias / condiciones médicas"
              name="allergies"
              rows={2}
              placeholder="Indica alergias, medicamentos o condiciones a considerar."
              defaultValue={student?.allergies ?? undefined}
            />
          </div>
          <TextField
            label="Contacto de emergencia"
            name="emergencyName"
            required={false}
            placeholder="Nombre"
            defaultValue={student?.emergencyName ?? undefined}
          />
          <TextField
            label="Teléfono de emergencia"
            name="emergencyPhone"
            type="tel"
            required={false}
            defaultValue={student?.emergencyPhone ?? undefined}
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
