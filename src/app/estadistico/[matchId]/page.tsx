import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { requireAuth } from "@/lib/tenant";
import {
  getMatchForScorekeeper,
  getMatchEvents,
  liveScore,
} from "@/lib/match-events";
import Link from "next/link";

import { formatKickoff } from "@/lib/competition";
import { AuthShell } from "@/components/auth-shell";
import { LiveForm } from "./live-form";

export default async function EstadisticoPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await requireAuth();
  const match = await getMatchForScorekeeper(matchId, session.user.id);

  if (!match) {
    return (
      <AuthShell
        title="Sin acceso"
        subtitle="No tienes permiso para capturar este partido. Pídele a la escuela que te designe como anotador."
      >
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-pitch px-5 py-2.5 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
        >
          Ir al inicio
        </Link>
      </AuthShell>
    );
  }

  const roster = await db.query.students.findMany({
    where: eq(studentsTable.teamId, match.teamId),
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
    columns: { id: true, firstName: true, lastName: true },
  });
  const players = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
  }));

  const events = await getMatchEvents(match.schoolId, matchId);
  const { ours, opp } = liveScore(events);

  const feed = events.map((e) => ({
    id: e.id,
    type: e.type,
    minute: e.minute,
    studentName: e.student
      ? `${e.student.firstName} ${e.student.lastName}`
      : null,
  }));

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="mb-1 text-center text-sm text-ink-soft">
        {formatKickoff(match.kickoffAt)}
      </div>
      <h1 className="mb-5 text-center font-display text-xl font-extrabold">
        {match.isHome
          ? `${match.team.name} vs ${match.opponentName}`
          : `${match.opponentName} vs ${match.team.name}`}
      </h1>

      <LiveForm
        matchId={matchId}
        teamName={match.team.name}
        opponentName={match.opponentName}
        isHome={match.isHome}
        ours={ours}
        opp={opp}
        players={players}
        events={feed}
      />
    </main>
  );
}
