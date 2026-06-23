import Link from "next/link";
import { asc, desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  tournaments as tournamentsTable,
  categories as categoriesTable,
} from "@/db/schema";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/competition";
import { PageHeader, Card } from "@/components/ui";
import { CreateTournamentForm } from "./forms";

export default async function AdminTorneosPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const [tournaments, categories] = await Promise.all([
    tdb.tournaments.findMany({
      with: { category: true },
      orderBy: [desc(tournamentsTable.createdAt)],
    }),
    tdb.categories.findMany({ orderBy: [asc(categoriesTable.name)] }),
  ]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Torneos"
        title="Torneos y ligas"
        subtitle="Agrupa partidos en un torneo y lleva su tabla de posiciones."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          {tournaments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Aún no tienes torneos. Crea uno aquí al lado.
            </p>
          ) : (
            <ul className="space-y-2">
              {tournaments.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/torneos/${t.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30 hover:shadow"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{t.name}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
                        {t.category ? ` · ${t.category.name}` : ""}
                      </p>
                    </div>
                    <svg
                      className="shrink-0 text-ink-soft"
                      width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nuevo torneo</p>
            <CreateTournamentForm categories={categoryOptions} />
          </Card>
        </div>
      </div>
    </div>
  );
}
