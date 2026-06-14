import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { teams as teamsTable, students as studentsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { StudentList } from "@/components/student-list";

export default async function EquipoDetallePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { membership } = await getActiveMembership();

  const team = await db.query.teams.findFirst({
    where: and(
      eq(teamsTable.id, teamId),
      eq(teamsTable.schoolId, membership.schoolId)
    ),
    with: { category: true },
  });
  if (!team) notFound();

  const students = await db.query.students.findMany({
    where: and(
      eq(studentsTable.schoolId, membership.schoolId),
      eq(studentsTable.teamId, teamId)
    ),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  const ages = students
    .map((s) => (s.birthDate ? ageFromISO(s.birthDate) : null))
    .filter((a): a is number => a !== null);
  const avgAge = ages.length
    ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
    : null;

  const nuevoHref = `/admin/alumnos/nuevo?team=${team.id}`;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/admin/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5M11 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Equipos
      </Link>

      <PageHeader
        eyebrow={team.category ? team.category.name : "Equipo"}
        title={
          <span className="inline-flex items-center gap-2.5">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: team.color || "var(--color-pitch)" }}
            />
            {team.name}
          </span>
        }
        subtitle={
          students.length
            ? `${students.length} alumno${students.length === 1 ? "" : "s"} en este equipo.`
            : "Este equipo aún no tiene alumnos."
        }
        action={<PrimaryLink href={nuevoHref}>Agregar alumno</PrimaryLink>}
      />

      {students.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Stat label="Alumnos" value={String(students.length)} />
          {avgAge !== null && <Stat label="Edad promedio" value={`${avgAge} años`} />}
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          title="Sin alumnos en este equipo"
          description="Agrega alumnos a este equipo; quedarán asignados automáticamente."
          action={<PrimaryLink href={nuevoHref}>Agregar alumno</PrimaryLink>}
        />
      ) : (
        <StudentList students={students} showBadges={false} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 shadow-sm">
      <span className="text-xs text-ink-soft">{label}</span>
      <p className="font-display text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

/** Edad en años a partir de una fecha ISO "YYYY-MM-DD". */
function ageFromISO(iso: string): number {
  const b = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
