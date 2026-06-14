import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories as categoriesTable, teams as teamsTable } from "@/db/schema";

/** Opciones de categoría y equipo para los selects del formulario de alumno. */
export async function getFormOptions(schoolId: string) {
  const cats = await db.query.categories.findMany({
    where: eq(categoriesTable.schoolId, schoolId),
    orderBy: [asc(categoriesTable.name)],
  });
  const tms = await db.query.teams.findMany({
    where: eq(teamsTable.schoolId, schoolId),
    with: { category: true },
    orderBy: [asc(teamsTable.name)],
  });

  return {
    categories: cats.map((c) => ({ value: c.id, label: c.name })),
    teams: tms.map((t) => ({
      value: t.id,
      label: t.category ? `${t.name} · ${t.category.name}` : t.name,
    })),
  };
}
