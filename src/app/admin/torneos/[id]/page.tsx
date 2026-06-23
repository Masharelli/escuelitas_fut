import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  matches as matchesTable,
  tournaments as tournamentsTable,
  tournamentStandings as standingsTable,
} from "@/db/schema";
import {
  TOURNAMENT_FORMAT_LABELS,
  formatKickoff,
  scoreLabel,
  resultOf,
  MATCH_STATUS_LABELS,
  type MatchStatus,
} from "@/lib/competition";
import { PageHeader, Card } from "@/components/ui";
import { AddStandingForm } from "../forms";
import { updateStanding, deleteStanding, deleteTournament } from "../actions";

export default async function TorneoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const tournament = await tdb.tournaments.findFirst({
    where: eq(tournamentsTable.id, id),
    with: { category: true },
  });
  if (!tournament) notFound();

  const [matches, standings] = await Promise.all([
    tdb.matches.findMany({
      where: eq(matchesTable.tournamentId, id),
      with: { team: true },
      orderBy: [desc(matchesTable.kickoffAt)],
    }),
    tdb.tournamentStandings.findMany({
      where: eq(standingsTable.tournamentId, id),
    }),
  ]);

  const table = standings
    .map((s) => ({ ...s, pts: s.won * 3 + s.drawn, gd: s.goalsFor - s.goalsAgainst }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.goalsFor - a.goalsFor);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/admin/torneos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Torneos
      </Link>

      <PageHeader
        eyebrow={TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}
        title={tournament.name}
        subtitle={tournament.category ? `Categoría ${tournament.category.name}` : undefined}
      />

      {/* Tabla de posiciones */}
      <h2 className="font-display text-lg font-bold">Tabla de posiciones</h2>
      <p className="mt-1 mb-3 text-xs text-ink-soft">
        Sube aquí los resultados que publica el torneo. Los puntos (3·G + 1·E) y
        la posición se calculan solos.
      </p>

      {table.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <div className="min-w-[640px] space-y-1.5">
            <div className="flex items-center gap-2 px-2 text-xs font-medium text-ink-soft">
              <span className="w-6 text-center">#</span>
              <span className="flex-1">Equipo</span>
              <span className="w-10 text-center">G</span>
              <span className="w-10 text-center">E</span>
              <span className="w-10 text-center">P</span>
              <span className="w-12 text-center">GF</span>
              <span className="w-12 text-center">GC</span>
              <span className="w-10 text-center">Pts</span>
              <span className="w-[120px]" />
            </div>
            {table.map((s, i) => (
              <form
                key={s.id}
                action={updateStanding}
                className={`flex items-center gap-2 rounded-xl border px-2 py-2 shadow-sm ${
                  s.isOurs ? "border-pitch/40 bg-pitch/[0.06]" : "border-ink/10 bg-white/80"
                }`}
              >
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <span className="w-6 text-center font-display font-bold text-ink-soft">
                  {i + 1}
                </span>
                <input
                  name="teamName"
                  defaultValue={s.teamName}
                  readOnly
                  className="flex-1 truncate bg-transparent text-sm font-semibold text-ink outline-none"
                />
                <NumCell name="won" value={s.won} />
                <NumCell name="drawn" value={s.drawn} />
                <NumCell name="lost" value={s.lost} />
                <NumCell name="goalsFor" value={s.goalsFor} wide />
                <NumCell name="goalsAgainst" value={s.goalsAgainst} wide />
                <span className="w-10 text-center font-display font-bold text-ink">
                  {s.pts}
                </span>
                <div className="flex w-[120px] shrink-0 items-center justify-end gap-1">
                  <button
                    type="submit"
                    className="rounded-full bg-pitch px-2.5 py-1 text-xs font-semibold text-chalk transition hover:bg-pitch-deep"
                  >
                    Guardar
                  </button>
                  <DeleteStandingButton id={s.id} />
                </div>
              </form>
            ))}
          </div>
        </div>
      )}

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Agregar equipo a la tabla</p>
        <AddStandingForm tournamentId={tournament.id} />
      </Card>

      {/* Partidos del torneo */}
      <h2 className="mt-8 font-display text-lg font-bold">Partidos de este torneo</h2>
      {matches.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          No hay partidos en este torneo. Al agendar un partido, elígelo en el
          campo «Torneo».
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {matches.map((m) => {
            const r = resultOf(m.ourScore, m.opponentScore);
            const tone = r === "win" ? "text-pitch" : r === "loss" ? "text-red-600" : "text-ink";
            return (
              <li key={m.id}>
                <Link
                  href={`/admin/partidos/${m.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 text-sm shadow-sm transition hover:border-pitch/30"
                >
                  <span className="min-w-0 truncate">
                    {m.team.name} <span className="text-ink-soft">{m.isHome ? "vs" : "@"}</span>{" "}
                    {m.opponentName}
                    <span className="ml-2 text-xs text-ink-soft">{formatKickoff(m.kickoffAt)}</span>
                  </span>
                  {m.status === "played" ? (
                    <span className={`shrink-0 font-display font-bold ${tone}`}>
                      {scoreLabel(m.ourScore, m.opponentScore)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-chalk-deep px-2 py-0.5 text-xs text-ink-soft">
                      {MATCH_STATUS_LABELS[m.status as MatchStatus]}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 border-t border-ink/10 pt-4">
        <form action={deleteTournament}>
          <input type="hidden" name="id" value={tournament.id} />
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
          >
            Eliminar torneo
          </button>
        </form>
      </div>
    </div>
  );
}

function NumCell({
  name,
  value,
  wide = false,
}: {
  name: string;
  value: number;
  wide?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      name={name}
      defaultValue={value}
      className={`${wide ? "w-12" : "w-10"} rounded-lg border border-ink/15 bg-white px-1 py-1 text-center text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20`}
    />
  );
}

function DeleteStandingButton({ id }: { id: string }) {
  return (
    <button
      type="submit"
      formAction={deleteStanding}
      name="id"
      value={id}
      aria-label="Eliminar fila"
      title="Eliminar"
      className="rounded-full px-2 py-1 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
    >
      ✕
    </button>
  );
}
