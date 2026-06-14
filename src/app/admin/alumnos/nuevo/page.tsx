import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { teams as teamsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "../student-form";
import { getFormOptions } from "../options";
import { createStudent } from "../actions";

export default async function NuevoAlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;
  const { membership } = await getActiveMembership();
  const { categories, teams } = await getFormOptions(membership.schoolId);

  // Si llegamos desde un equipo, preseleccionamos ese equipo y su categoría.
  let defaultTeamId: string | undefined;
  let defaultCategoryId: string | undefined;
  if (team) {
    const t = await db.query.teams.findFirst({
      where: and(eq(teamsTable.id, team), eq(teamsTable.schoolId, membership.schoolId)),
    });
    if (t) {
      defaultTeamId = t.id;
      defaultCategoryId = t.categoryId ?? undefined;
    }
  }

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
        defaultCategoryId={defaultCategoryId}
        defaultTeamId={defaultTeamId}
      />
    </div>
  );
}
