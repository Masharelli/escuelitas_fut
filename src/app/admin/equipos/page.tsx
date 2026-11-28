import Link from "next/link";
import { asc, count, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { categories as categoriesTable, teams as teamsTable, students as studentsTable } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { PortalIcon } from "@/components/portal/portal-icon";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { TeamCreationActions } from "./forms";
import { deleteCategory, deleteTeam } from "./actions";

const UNASSIGNED = "sin-categoria";

export default async function EquiposPage({ searchParams }: {
  searchParams: Promise<{ categoria?: string | string[] }>;
}) {
  const [{ membership }, { categoria }] = await Promise.all([requireRole(ADMIN_ROLES), searchParams]);
  const tdb = tenantDb(membership.schoolId);

  const [categories, teams, counts] = await Promise.all([
    tdb.categories.findMany({ orderBy: [asc(categoriesTable.name)] }),
    tdb.teams.findMany({ orderBy: [asc(teamsTable.name)] }),
    db.select({ teamId: studentsTable.teamId, value: count() })
      .from(studentsTable)
      .where(tdb.students.scope(isNotNull(studentsTable.teamId)))
      .groupBy(studentsTable.teamId),
  ]);

  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const countByTeam = new Map(counts.map((item) => [item.teamId, item.value]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const selectedCategory = categories.find((category) => category.id === categoria);
  const selection = selectedCategory?.id ?? (categoria === UNASSIGNED ? UNASSIGNED : "");
  const activeTitle = selectedCategory?.name ?? (selection === UNASSIGNED ? "Sin categoría" : "Todas las categorías");
  const categoryLinks = [
    { value: "", label: "Todas" },
    ...categoryOptions,
    { value: UNASSIGNED, label: "Sin categoría" },
  ];
  const rows = teams
    .filter((team) => !selection || (team.categoryId ?? UNASSIGNED) === selection)
    .map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      count: countByTeam.get(team.id) ?? 0,
      category: selection ? undefined : categoryNames.get(team.categoryId ?? "") ?? "Sin categoría",
    }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Estructura deportiva"
        title="Equipos y categorías"
        subtitle="Organiza a tus alumnos por categoría y equipo."
        action={<TeamCreationActions categories={categoryOptions} selectedCategoryId={selectedCategory?.id} />}
      />

      <Card className="grid items-start gap-5 md:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)] lg:gap-7">
        <nav aria-labelledby="categorias-titulo" className="min-w-0 border-b border-outline-variant pb-4 md:border-b-0 md:pb-0">
          <h2 id="categorias-titulo" className="mb-3 font-display text-lg font-bold">Categorías</h2>
          <ul role="list" className="flex flex-wrap gap-1.5 md:flex-col">
            {categoryLinks.map(({ value, label }) => (
              <li key={value} className="min-w-0 max-w-full">
                <Link
                  href={value ? `/admin/equipos?categoria=${encodeURIComponent(value)}` : "/admin/equipos"}
                  aria-current={selection === value ? "page" : undefined}
                  scroll={false}
                  prefetch={false}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-container hover:text-ink focus-visible:outline-2 focus-visible:outline-pitch aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container"
                >
                  <PortalIcon icon="students" size={18} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="equipos-titulo" className="min-w-0">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="equipos-titulo" className="font-display text-xl font-extrabold sm:text-2xl">{activeTitle}</h2>
              {selectedCategory?.birthYear && <p className="mt-1 text-sm text-ink-soft">Año {selectedCategory.birthYear}</p>}
            </div>
            {selectedCategory && (
              <DeleteButton action={deleteCategory} id={selectedCategory.id} label={`Eliminar categoría ${selectedCategory.name}`} />
            )}
          </header>
          {rows.length ? (
            <TeamTable teams={rows} />
          ) : (
            <EmptyState
              icon={<PortalIcon icon="teams" />}
              title={selection ? "No hay equipos en esta vista" : "Aún no tienes equipos"}
              description="Usa Nuevo equipo para agregar uno. La categoría es opcional."
            />
          )}
        </section>
      </Card>
    </div>
  );
}

function TeamTable({ teams }: {
  teams: { id: string; name: string; color: string | null; count: number; category?: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant">
      <table aria-labelledby="equipos-titulo" className="w-full table-fixed text-sm">
        <thead className="bg-surface-container text-left font-semibold">
          <tr>
            <th scope="col" className="px-2 py-3 sm:px-4">Equipo</th>
            <th scope="col" className="w-16 px-0.5 py-3 text-center text-xs whitespace-nowrap sm:w-20 sm:text-sm">Alumnos</th>
            <th scope="col" className="w-14 sm:w-40"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {teams.map((team) => (
            <tr key={team.id}>
              <th scope="row" className="px-2 py-3 text-left font-semibold sm:px-4">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-container sm:size-9" style={{ color: team.color || "var(--color-pitch)" }}>
                    <PortalIcon icon="teams" size={20} />
                  </span>
                  <div className="min-w-0">
                    <span className="block">{team.name}</span>
                    {team.category && <span className="mt-0.5 block text-xs font-normal text-ink-soft">{team.category}</span>}
                  </div>
                </div>
              </th>
              <td className="text-center font-semibold tabular-nums">{team.count}</td>
              <td className="py-1.5 pr-1 sm:pr-3">
                <div className="flex flex-col items-center justify-end sm:flex-row sm:gap-1">
                  <Link
                    href={`/admin/equipos/${team.id}`}
                    aria-label={`Ver equipo ${team.name}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-surface-container px-1.5 text-sm font-semibold text-pitch hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-pitch sm:min-h-10 sm:px-3"
                  >
                    <span aria-hidden="true" className="text-xl sm:hidden">›</span>
                    <span className="hidden sm:inline">Ver equipo</span>
                  </Link>
                  <DeleteButton action={deleteTeam} id={team.id} label={`Eliminar ${team.name}`} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteButton({ action, id, label }: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        data-plain
        aria-label={label}
        title={label}
        className="inline-flex size-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-pitch sm:size-9"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
