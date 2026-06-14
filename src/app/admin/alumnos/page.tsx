import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { StudentList } from "@/components/student-list";
import { StudentFilters } from "./student-filters";
import { getFormOptions } from "./options";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; team?: string }>;
}) {
  const { q, cat, team } = await searchParams;
  const { membership } = await getActiveMembership();
  const schoolId = membership.schoolId;

  // ¿Hay alumnos en total? (para distinguir "sin alumnos" de "sin resultados")
  const total = await db
    .select({ value: count() })
    .from(studentsTable)
    .where(eq(studentsTable.schoolId, schoolId))
    .then((r) => r[0]?.value ?? 0);

  const conditions = [eq(studentsTable.schoolId, schoolId)];
  if (cat) conditions.push(eq(studentsTable.categoryId, cat));
  if (team) conditions.push(eq(studentsTable.teamId, team));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(studentsTable.firstName, like),
        ilike(studentsTable.lastName, like),
        sql`(${studentsTable.firstName} || ' ' || ${studentsTable.lastName}) ilike ${like}`
      )!
    );
  }

  const students = await db.query.students.findMany({
    where: and(...conditions),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  const { categories, teams } = await getFormOptions(schoolId);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Alumnos"
        title="Alumnos"
        subtitle={
          total
            ? `${total} alumno${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}.`
            : "Registra a los alumnos de tu escuela."
        }
        action={
          total > 0 ? (
            <PrimaryLink href="/admin/alumnos/nuevo">
              <PlusIcon /> Nuevo alumno
            </PrimaryLink>
          ) : undefined
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Aún no hay alumnos"
          description="Da de alta a tu primer alumno con sus datos, categoría y la información de su tutor."
          action={
            <PrimaryLink href="/admin/alumnos/nuevo">
              <PlusIcon /> Registrar alumno
            </PrimaryLink>
          }
        />
      ) : (
        <>
          <StudentFilters categories={categories} teams={teams} />
          {students.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-ink-soft">
              No encontramos alumnos con esos filtros.
            </p>
          ) : (
            <StudentList students={students} />
          )}
        </>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
