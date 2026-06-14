import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "../../student-form";
import { getFormOptions } from "../../options";
import { updateStudent } from "../../actions";

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await getActiveMembership();

  const student = await db.query.students.findFirst({
    where: and(
      eq(studentsTable.id, id),
      eq(studentsTable.schoolId, membership.schoolId)
    ),
  });
  if (!student) notFound();

  const { categories, teams } = await getFormOptions(membership.schoolId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Alumnos"
        title={`${student.firstName} ${student.lastName}`}
        subtitle="Edita los datos del alumno."
      />
      <StudentForm
        action={updateStudent}
        categories={categories}
        teams={teams}
        student={student}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
