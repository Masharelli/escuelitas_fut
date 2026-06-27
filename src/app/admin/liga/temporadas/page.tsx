import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { seasons as seasonsTable } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { CreateSeasonForm } from "./forms";
import { deleteSeason } from "./actions";

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

  const seasons = await tdb.seasons.findMany({
    with: { seasonTeams: { columns: { id: true } } },
    orderBy: [desc(seasonsTable.createdAt)],
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Liga"
        title="Temporadas"
        subtitle="Crea una temporada y entra a ella para inscribir equipos, generar el calendario y llevar la tabla."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nueva temporada</p>
          <CreateSeasonForm />
        </Card>

        <div className="space-y-2">
          {seasons.length === 0 ? (
            <EmptyState
              title="Aún no hay temporadas"
              description="Crea la primera temporada con el formulario."
            />
          ) : (
            seasons.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30"
              >
                <Link href={`/admin/liga/temporadas/${s.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-ink">{s.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? "bg-ink/10 text-ink-soft"}`}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {s.seasonTeams.length} equipo{s.seasonTeams.length === 1 ? "" : "s"}
                    {s.startsOn ? ` · ${fmtDate(s.startsOn)}` : ""}
                    {s.endsOn ? ` – ${fmtDate(s.endsOn)}` : ""}
                  </p>
                </Link>
                <form action={deleteSeason} className="shrink-0">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
