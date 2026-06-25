import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { leagueTeams as leagueTeamsTable, seasons as seasonsTable } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { CreateSeasonForm, RegisterTeamForm } from "./forms";
import { deleteSeason, setSeasonStatus, unregisterTeam } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Próxima",
  active: "En curso",
  finished: "Terminada",
};
const STATUS_STYLE: Record<string, string> = {
  upcoming: "bg-sky-100 text-sky-700",
  active: "bg-pitch/15 text-pitch",
  finished: "bg-ink/10 text-ink-soft",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function LigaTemporadasPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  if (membership.school.kind !== "league") redirect("/admin");
  const tdb = tenantDb(membership.schoolId);

  const [seasons, allTeams] = await Promise.all([
    tdb.seasons.findMany({
      with: { seasonTeams: { with: { team: true } } },
      orderBy: [desc(seasonsTable.createdAt)],
    }),
    tdb.leagueTeams.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(leagueTeamsTable.name)],
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Liga"
        title="Temporadas"
        subtitle="Crea una temporada e inscribe a los equipos que participan."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nueva temporada</p>
          <CreateSeasonForm />
        </Card>

        <div className="space-y-4">
          {seasons.length === 0 ? (
            <EmptyState
              title="Aún no hay temporadas"
              description="Crea la primera temporada con el formulario."
            />
          ) : (
            seasons.map((s) => {
              const registeredIds = new Set(s.seasonTeams.map((st) => st.teamId));
              const options = allTeams
                .filter((t) => !registeredIds.has(t.id))
                .map((t) => ({ value: t.id, label: t.name }));
              return (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-bold">{s.name}</h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? "bg-ink/10 text-ink-soft"}`}
                        >
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </div>
                      {(s.startsOn || s.endsOn) && (
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {fmtDate(s.startsOn)}
                          {s.endsOn ? ` – ${fmtDate(s.endsOn)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={setSeasonStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={s.id} />
                        <select
                          name="status"
                          defaultValue={s.status}
                          className="rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-xs text-ink shadow-sm"
                        >
                          <option value="upcoming">Próxima</option>
                          <option value="active">En curso</option>
                          <option value="finished">Terminada</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink"
                        >
                          Guardar
                        </button>
                      </form>
                      <form action={deleteSeason}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          aria-label="Eliminar temporada"
                          title="Eliminar temporada"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Equipos inscritos */}
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {s.seasonTeams.length} equipo{s.seasonTeams.length === 1 ? "" : "s"}
                    </p>
                    {s.seasonTeams.length > 0 && (
                      <ul className="mb-3 flex flex-wrap gap-2">
                        {s.seasonTeams.map((st) => (
                          <li
                            key={st.id}
                            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-chalk py-1 pl-3 pr-1.5 text-sm"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: st.team.color || "var(--color-pitch)" }}
                            />
                            <span className="max-w-[10rem] truncate">{st.team.name}</span>
                            <form action={unregisterTeam}>
                              <input type="hidden" name="id" value={st.id} />
                              <button
                                type="submit"
                                aria-label={`Quitar ${st.team.name}`}
                                title={`Quitar ${st.team.name}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                    {allTeams.length === 0 ? (
                      <p className="text-xs text-ink-soft">
                        Primero registra equipos en{" "}
                        <Link href="/admin/liga/equipos" className="font-medium text-pitch hover:underline">
                          Equipos
                        </Link>
                        .
                      </p>
                    ) : (
                      <RegisterTeamForm seasonId={s.id} options={options} />
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
