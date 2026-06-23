import Link from "next/link";
import { asc, desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  matches as matchesTable,
  teams as teamsTable,
  tournaments as tournamentsTable,
} from "@/db/schema";
import {
  formatKickoff,
  scoreLabel,
  resultOf,
  MATCH_STATUS_LABELS,
  type MatchStatus,
} from "@/lib/competition";
import { PageHeader, Card } from "@/components/ui";
import { CreateMatchForm } from "./forms";

export default async function AdminPartidosPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const [matches, teams, tournaments] = await Promise.all([
    tdb.matches.findMany({
      with: { team: true },
      orderBy: [desc(matchesTable.kickoffAt)],
    }),
    tdb.teams.findMany({ orderBy: [asc(teamsTable.name)] }),
    tdb.tournaments.findMany({ orderBy: [asc(tournamentsTable.name)] }),
  ]);

  const upcoming = matches
    .filter((m) => m.status === "scheduled" || m.status === "postponed")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
  const finished = matches.filter(
    (m) => m.status === "played" || m.status === "canceled"
  );

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  const tournamentOptions = tournaments.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Partidos"
        title="Partidos"
        subtitle="Agenda los partidos de tus equipos y captura los resultados."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <h2 className="font-display text-lg font-bold">Próximos</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              No hay partidos programados. Agenda uno aquí al lado.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </ul>
          )}

          <h2 className="mt-8 font-display text-lg font-bold">Resultados</h2>
          {finished.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Aún no hay partidos jugados.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {finished.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nuevo partido</p>
            <CreateMatchForm teams={teamOptions} tournaments={tournamentOptions} />
          </Card>
        </div>
      </div>
    </div>
  );
}

type Row = {
  id: string;
  opponentName: string;
  isHome: boolean;
  kickoffAt: Date;
  location: string | null;
  status: string;
  ourScore: number | null;
  opponentScore: number | null;
  team: { name: string };
};

function MatchRow({ match: m }: { match: Row }) {
  const result = resultOf(m.ourScore, m.opponentScore);
  const resultTone =
    result === "win"
      ? "text-pitch"
      : result === "loss"
        ? "text-red-600"
        : "text-ink";

  return (
    <li>
      <Link
        href={`/admin/partidos/${m.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30 hover:shadow"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {m.team.name}{" "}
            <span className="text-ink-soft">{m.isHome ? "vs" : "@"}</span>{" "}
            {m.opponentName}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {formatKickoff(m.kickoffAt)}
            {m.location ? ` · ${m.location}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {m.status === "played" ? (
            <span className={`font-display text-lg font-bold ${resultTone}`}>
              {scoreLabel(m.ourScore, m.opponentScore)}
            </span>
          ) : (
            <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              {MATCH_STATUS_LABELS[m.status as MatchStatus]}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
