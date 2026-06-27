import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireRole } from "@/lib/tenant";
import { assertTeamAccess } from "@/lib/coach";
import { tenantDb } from "@/lib/tenant-db";
import { students as studentsTable, matches as matchesTable } from "@/db/schema";
import { formatKickoff, MATCH_STATUS_LABELS, type MatchStatus } from "@/lib/competition";
import { getCallupsForMatch, type RsvpStatus } from "@/lib/callups";
import { getTeamGuardianUsers } from "@/lib/guardians";
import { PageHeader, Card } from "@/components/ui";
import { CallupManager } from "@/components/callup-manager";
import { ScorekeeperForm } from "@/components/scorekeeper-form";
import { ResultForm } from "@/app/admin/partidos/[id]/result-form";

export default async function CoachMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(["coach"]);
  const tdb = tenantDb(membership.schoolId);

  const match = await tdb.matches.findFirst({
    where: eq(matchesTable.id, id),
    with: { team: true, tournament: true, playerStats: true },
  });
  if (!match) notFound();
  await assertTeamAccess(membership, match.teamId);

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

  const callupRows = await getCallupsForMatch(membership.schoolId, match.id);
  const callupByStudent = new Map(callupRows.map((c) => [c.studentId, c]));
  const callupPlayers = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    convoked: callupByStudent.has(s.id),
    rsvp: (callupByStudent.get(s.id)?.rsvp ?? "pending") as RsvpStatus,
  }));

  const scorekeeperCandidates = await getTeamGuardianUsers(match.teamId);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={`/coach/equipos/${match.teamId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {match.team.name}
      </Link>

      <PageHeader
        eyebrow={match.tournament ? match.tournament.name : match.isHome ? "Local" : "Visitante"}
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
        <p className="mb-3 text-sm font-semibold text-ink">Seguimiento en vivo</p>
        <ScorekeeperForm
          matchId={match.id}
          current={match.scorekeeperUserId}
          candidates={scorekeeperCandidates}
        />
      </Card>
    </div>
  );
}
