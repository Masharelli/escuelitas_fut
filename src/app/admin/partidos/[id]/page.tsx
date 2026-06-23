import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { students as studentsTable, matches as matchesTable } from "@/db/schema";
import { formatKickoff, MATCH_STATUS_LABELS, type MatchStatus } from "@/lib/competition";
import { PageHeader, Card } from "@/components/ui";
import { ResultForm } from "./result-form";
import { setMatchStatus, deleteMatch } from "../actions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const match = await tdb.matches.findFirst({
    where: eq(matchesTable.id, id),
    with: { team: true, tournament: true, playerStats: true },
  });
  if (!match) notFound();

  // Alumnos activos del equipo, con sus estadísticas actuales (si las hay).
  const roster = await tdb.students.findMany({
    where: and(
      eq(studentsTable.teamId, match.teamId),
      eq(studentsTable.status, "active")
    ),
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
    columns: { id: true, firstName: true, lastName: true },
  });

  const statByStudent = new Map(
    match.playerStats.map((s) => [s.studentId, s] as const)
  );
  const players = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    goals: statByStudent.get(s.id)?.goals ?? 0,
    assists: statByStudent.get(s.id)?.assists ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/partidos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Partidos
      </Link>

      <PageHeader
        eyebrow={
          match.tournament ? match.tournament.name : match.isHome ? "Local" : "Visitante"
        }
        title={`${match.team.name} ${match.isHome ? "vs" : "@"} ${match.opponentName}`}
        subtitle={`${formatKickoff(match.kickoffAt)}${match.location ? ` · ${match.location}` : ""} · ${MATCH_STATUS_LABELS[match.status as MatchStatus]}`}
      />

      <Card>
        <ResultForm
          matchId={match.id}
          opponentName={match.opponentName}
          ourScore={match.ourScore}
          opponentScore={match.opponentScore}
          players={players}
        />
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {match.status !== "canceled" && (
          <StatusButton matchId={match.id} status="canceled" label="Cancelar partido" />
        )}
        {match.status !== "postponed" && match.status !== "played" && (
          <StatusButton matchId={match.id} status="postponed" label="Posponer" />
        )}
        {match.status !== "scheduled" && match.status !== "played" && (
          <StatusButton matchId={match.id} status="scheduled" label="Reprogramar" />
        )}
        <form action={deleteMatch} className="ml-auto">
          <input type="hidden" name="matchId" value={match.id} />
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
          >
            Eliminar
          </button>
        </form>
      </div>
    </div>
  );
}

function StatusButton({
  matchId,
  status,
  label,
}: {
  matchId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setMatchStatus}>
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
      >
        {label}
      </button>
    </form>
  );
}
