import { asc } from "drizzle-orm";

import { categories as categoriesTable, teams as teamsTable } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";

/** Opciones de categoría y equipo para los selects del formulario de alumno. */
export async function getFormOptions(schoolId: string) {
  const tdb = tenantDb(schoolId);
  const cats = await tdb.categories.findMany({
    orderBy: [asc(categoriesTable.name)],
  });
  const tms = await tdb.teams.findMany({
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
