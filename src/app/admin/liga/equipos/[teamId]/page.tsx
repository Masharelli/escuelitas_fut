import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { rosterPlayers as rosterTable, leagueTeams } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { AddPlayerForm } from "../forms";
import { deleteLeagueTeam, removeRosterPlayer } from "../actions";

export default async function LigaTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  if (membership.school.kind !== "league") redirect("/admin");
  const tdb = tenantDb(membership.schoolId);

  const team = await tdb.leagueTeams.findFirst({
    where: eq(leagueTeams.id, teamId),
    with: { roster: { orderBy: [asc(rosterTable.name)] } },
  });
  if (!team) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/liga/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Equipos
      </Link>

      <PageHeader
        eyebrow="Equipo"
        title={
          <span className="flex items-center gap-2.5">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: team.color || "var(--color-pitch)" }}
            />
            {team.name}
          </span>
        }
        subtitle={
          [team.managerName, team.managerPhone, team.managerEmail]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        action={
          <form action={deleteLeagueTeam}>
            <input type="hidden" name="id" value={team.id} />
            <button
              type="submit"
              className="rounded-full border border-ink/15 px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Eliminar equipo
            </button>
          </form>
        }
      />

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">
          Roster {team.roster.length > 0 && `(${team.roster.length})`}
        </p>

        {team.roster.length === 0 ? (
          <p className="mb-4 rounded-xl border border-dashed border-ink/15 bg-white/60 px-4 py-3 text-sm text-ink-soft">
            Aún no hay jugadores. Agrega el primero abajo.
          </p>
        ) : (
          <ul className="mb-4 space-y-1.5">
            {team.roster.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white/80 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-chalk-deep text-xs font-bold text-ink-soft">
                    {p.number || "—"}
                  </span>
                  <span className="truncate text-sm font-medium text-ink">
                    {p.name}
                    {p.position && (
                      <span className="ml-2 text-xs font-normal text-ink-soft">
                        {p.position}
                      </span>
                    )}
                  </span>
                </div>
                <form action={removeRosterPlayer} className="shrink-0">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    type="submit"
                    aria-label={`Quitar ${p.name}`}
                    title={`Quitar ${p.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-ink/10 pt-4">
          <AddPlayerForm teamId={team.id} />
        </div>
      </Card>
    </div>
  );
}
