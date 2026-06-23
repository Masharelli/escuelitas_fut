import { notFound } from "next/navigation";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
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
  const { membership } = await requireRole(ADMIN_ROLES);

  const student = await tenantDb(membership.schoolId).students.findById(id);
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
