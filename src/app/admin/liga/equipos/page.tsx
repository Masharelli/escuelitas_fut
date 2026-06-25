import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { leagueTeams as leagueTeamsTable } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { CreateLeagueTeamForm } from "./forms";

export default async function LigaEquiposPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  if (membership.school.kind !== "league") redirect("/admin");
  const tdb = tenantDb(membership.schoolId);

  const teams = await tdb.leagueTeams.findMany({
    with: { roster: { columns: { id: true } } },
    orderBy: [asc(leagueTeamsTable.name)],
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Liga"
        title="Equipos participantes"
        subtitle="Registra los equipos de la liga, su responsable y su roster."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nuevo equipo</p>
          <CreateLeagueTeamForm />
        </Card>

        <div>
          {teams.length === 0 ? (
            <EmptyState
              title="Aún no hay equipos"
              description="Agrega el primer equipo participante con el formulario."
            />
          ) : (
            <ul className="space-y-2">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/liga/equipos/${t.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30 hover:shadow"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color || "var(--color-pitch)" }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{t.name}</p>
                        {t.managerName && (
                          <p className="truncate text-xs text-ink-soft">
                            {t.managerName}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                      {t.roster.length} jug.
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
