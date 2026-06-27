import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { students as studentsTable, matches as matchesTable } from "@/db/schema";
import { formatKickoff, MATCH_STATUS_LABELS, type MatchStatus } from "@/lib/competition";
import { getCallupsForMatch, type RsvpStatus } from "@/lib/callups";
import { getTeamGuardianUsers } from "@/lib/guardians";
import { PageHeader, Card } from "@/components/ui";
import { CallupManager } from "@/components/callup-manager";
import { ScorekeeperForm } from "@/components/scorekeeper-form";
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
    yellowCards: statByStudent.get(s.id)?.yellowCards ?? 0,
    redCards: statByStudent.get(s.id)?.redCards ?? 0,
    minutesPlayed: statByStudent.get(s.id)?.minutesPlayed ?? 0,
  }));

  // Candidatos a "papá estadístico": tutores del equipo (Fase F).
  const scorekeeperCandidates = await getTeamGuardianUsers(match.teamId);

  // Convocatoria del partido (Fase C).
  const callupRows = await getCallupsForMatch(membership.schoolId, match.id);
  const callupByStudent = new Map(callupRows.map((c) => [c.studentId, c]));
  const callupPlayers = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    convoked: callupByStudent.has(s.id),
    rsvp: (callupByStudent.get(s.id)?.rsvp ?? "pending") as RsvpStatus,
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

      {(match.mapUrl || match.requiredUniform) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {match.mapUrl && (
            <a
              href={match.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-pitch hover:underline"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Ver ubicación
            </a>
          )}
          {match.requiredUniform && (
            <span className="text-ink-soft">
              👕 Uniforme: <span className="text-ink">{match.requiredUniform}</span>
            </span>
          )}
        </div>
      )}

      <Card>
        <ResultForm
          matchId={match.id}
          opponentName={match.opponentName}
          ourScore={match.ourScore}
          opponentScore={match.opponentScore}
          players={players}
        />
      </Card>

      {callupPlayers.length > 0 && (
        <Card className="mt-4">
          <p className="mb-3 text-sm font-semibold text-ink">Convocatoria</p>
          <CallupManager
            target="match"
            targetId={match.id}
            players={callupPlayers}
          />
        </Card>
      )}

      <Card className="mt-4">
        <p className="mb-3 text-sm font-semibold text-ink">
          Seguimiento en vivo
        </p>
        <ScorekeeperForm
          matchId={match.id}
          current={match.scorekeeperUserId}
          candidates={scorekeeperCandidates}
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
