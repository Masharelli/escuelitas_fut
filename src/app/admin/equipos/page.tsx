import Link from "next/link";
import { asc, count, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  categories as categoriesTable,
  teams as teamsTable,
  students as studentsTable,
} from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { PageHeader, Card } from "@/components/ui";
import { CreateCategoryForm, CreateTeamForm } from "./forms";
import { deleteCategory, deleteTeam } from "./actions";

export default async function EquiposPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  const schoolId = membership.schoolId;
  const tdb = tenantDb(schoolId);

  const categories = await tdb.categories.findMany({
    with: { teams: true },
    orderBy: [asc(categoriesTable.name)],
  });
  const looseTeams = await tdb.teams.findMany({
    where: isNull(teamsTable.categoryId),
    orderBy: [asc(teamsTable.name)],
  });

  // Conteo de alumnos por equipo.
  const counts = await db
    .select({ teamId: studentsTable.teamId, value: count() })
    .from(studentsTable)
    .where(tdb.students.scope())
    .groupBy(studentsTable.teamId);
  const countByTeam = new Map(
    counts.map((c) => [c.teamId, c.value] as const)
  );

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const isEmpty = categories.length === 0 && looseTeams.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Estructura deportiva"
        title="Equipos y categorías"
        subtitle="Organiza a tus alumnos por categoría (edad) y equipo."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nueva categoría</p>
          <CreateCategoryForm />
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nuevo equipo</p>
          <CreateTeamForm categories={categoryOptions} />
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        {isEmpty && (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-ink-soft">
            Aún no tienes categorías ni equipos. Crea tu primera categoría arriba.
          </p>
        )}

        {categories.map((cat) => (
          <Card key={cat.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">{cat.name}</h2>
                {cat.birthYear && (
                  <span className="text-xs text-ink-soft">Año {cat.birthYear}</span>
                )}
              </div>
              <DeleteButton action={deleteCategory} id={cat.id} label="Eliminar categoría" />
            </div>
            <TeamList teams={cat.teams} countByTeam={countByTeam} />
          </Card>
        ))}

        {looseTeams.length > 0 && (
          <Card>
            <h2 className="font-display text-lg font-bold text-ink-soft">
              Sin categoría
            </h2>
            <TeamList teams={looseTeams} countByTeam={countByTeam} />
          </Card>
        )}
      </div>
    </div>
  );
}

function TeamList({
  teams,
  countByTeam,
}: {
  teams: { id: string; name: string; color: string | null }[];
  countByTeam: Map<string | null, number>;
}) {
  if (teams.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-soft">Sin equipos en esta categoría.</p>
    );
  }
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {teams.map((t) => {
        const n = countByTeam.get(t.id) ?? 0;
        return (
          <li key={t.id} className="flex items-center">
            <Link
              href={`/admin/equipos/${t.id}`}
              className="flex items-center gap-2 rounded-full border border-ink/10 bg-chalk py-1.5 pl-3 pr-2.5 text-sm transition hover:border-pitch/30 hover:bg-pitch/5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: t.color || "var(--color-pitch)" }}
              />
              {t.name}
              <span className="rounded-full bg-chalk-deep px-2 py-0.5 text-xs font-medium text-ink-soft">
                {n}
              </span>
            </Link>
            <DeleteButton action={deleteTeam} id={t.id} label={`Eliminar ${t.name}`} small />
          </li>
        );
      })}
    </ul>
  );
}

function DeleteButton({
  action,
  id,
  label,
  small = false,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
  small?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600 ${
          small ? "h-5 w-5" : "h-8 w-8"
        }`}
      >
        <svg
          width={small ? 13 : 16}
          height={small ? 13 : 16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
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
