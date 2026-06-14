import { getActiveMembership } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "../student-form";
import { getFormOptions } from "../options";
import { createStudent } from "../actions";

export default async function NuevoAlumnoPage() {
  const { membership } = await getActiveMembership();
  const { categories, teams } = await getFormOptions(membership.schoolId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Alumnos"
        title="Nuevo alumno"
        subtitle="Registra al alumno y, si quieres, asígnalo a una categoría y equipo."
      />
      <StudentForm
        action={createStudent}
        categories={categories}
        teams={teams}
        submitLabel="Registrar alumno"
      />
    </div>
  );
}
