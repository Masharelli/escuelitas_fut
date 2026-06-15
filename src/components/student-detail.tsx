import Image from "next/image";

import { Card } from "@/components/ui";

export type StudentDetailData = {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  photoUrl: string | null;
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
  category?: { name: string } | null;
  team?: { name: string } | null;
};

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export function StudentDetail({
  student,
  showGuardian = true,
}: {
  student: StudentDetailData;
  showGuardian?: boolean;
}) {
  const age = student.birthDate ? ageFromISO(student.birthDate) : null;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center gap-4">
          <Photo name={student.firstName} photoUrl={student.photoUrl} />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold tracking-tight">
              {student.firstName} {student.lastName}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {student.category && <Badge>{student.category.name}</Badge>}
              {student.team && <Badge>{student.team.name}</Badge>}
              {age !== null && <Badge>{age} años</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <Section
        title="Datos personales"
        fields={[
          ["Fecha de nacimiento", formatDate(student.birthDate)],
          ["Sexo", student.sex ? cap(student.sex) : null],
          ["Nacionalidad", student.nationality],
          ["CURP", student.curp],
        ]}
      />
      <Section
        title="Dirección y escuela"
        fields={[
          ["Dirección", student.address],
          ["Ciudad", student.city],
          ["Colegio", student.school],
        ]}
      />
      <Section
        title="Datos deportivos"
        fields={[
          ["Posición", student.position ? cap(student.position) : null],
          ["Pie dominante", student.dominantFoot ? cap(student.dominantFoot) : null],
          ["Talla de uniforme", student.jerseySize],
        ]}
      />
      <Section
        title="Salud y emergencia"
        fields={[
          ["Tipo de sangre", student.bloodType],
          ["Alergias / condiciones", student.allergies],
          ["Contacto de emergencia", student.emergencyName],
          ["Teléfono de emergencia", student.emergencyPhone],
        ]}
      />
      {showGuardian && (
        <Section
          title="Tutor"
          fields={[
            ["Nombre", student.guardianName],
            ["Teléfono", student.guardianPhone],
            ["Correo", student.guardianEmail],
            ["Notas", student.notes],
          ]}
        />
      )}
    </div>
  );
}

function Section({
  title,
  fields,
}: {
  title: string;
  fields: [string, string | null | undefined][];
}) {
  const present = fields.filter(
    ([, v]) => v != null && String(v).trim() !== ""
  );
  if (present.length === 0) return null;
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-ink">{title}</p>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {present.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Photo({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={64}
        height={64}
        unoptimized
        className="h-16 w-16 shrink-0 rounded-full border border-ink/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-pitch/10 text-xl font-semibold text-pitch">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function ageFromISO(iso: string): number {
  const b = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const mo = now.getMonth() - b.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
