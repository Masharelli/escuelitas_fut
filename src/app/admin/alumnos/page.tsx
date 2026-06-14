import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { StudentList } from "@/components/student-list";

export default async function AlumnosPage() {
  const { membership } = await getActiveMembership();

  const students = await db.query.students.findMany({
    where: eq(studentsTable.schoolId, membership.schoolId),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Alumnos"
        title="Alumnos"
        subtitle={
          students.length
            ? `${students.length} alumno${students.length === 1 ? "" : "s"} registrado${students.length === 1 ? "" : "s"}.`
            : "Registra a los alumnos de tu escuela."
        }
        action={
          students.length > 0 ? (
            <PrimaryLink href="/admin/alumnos/nuevo">
              <PlusIcon /> Nuevo alumno
            </PrimaryLink>
          ) : undefined
        }
      />

      {students.length === 0 ? (
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
        <StudentList students={students} />
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
