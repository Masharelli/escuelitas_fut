import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";

import {
  teams as teamsTable,
  students as studentsTable,
  matches as matchesTable,
  trainingSessions as sessionsTable,
  tournaments as tournamentsTable,
} from "@/db/schema";
import { requireRole } from "@/lib/tenant";
import { assertTeamAccess } from "@/lib/coach";
import { tenantDb } from "@/lib/tenant-db";
import {
  formatKickoff,
  scoreLabel,
  resultOf,
  MATCH_STATUS_LABELS,
  type MatchStatus,
} from "@/lib/competition";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { PageHeader, Card } from "@/components/ui";
import { StudentList } from "@/components/student-list";
import { CreateSessionForm } from "@/app/admin/asistencias/forms";
import { CreateMatchForm } from "@/app/admin/partidos/forms";

export default async function CoachTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { membership } = await requireRole(["coach"]);
  await assertTeamAccess(membership, teamId);

  const tdb = tenantDb(membership.schoolId);
  const team = await tdb.teams.findFirst({
    where: eq(teamsTable.id, teamId),
    with: { category: true },
  });
  if (!team) notFound();

  const [students, sessions, matches, tournaments] = await Promise.all([
    tdb.students.findMany({
      where: eq(studentsTable.teamId, teamId),
      with: { category: true, team: true },
      orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
    }),
    tdb.sessions.findMany({
      where: eq(sessionsTable.teamId, teamId),
      orderBy: [desc(sessionsTable.startsAt)],
    }),
    tdb.matches.findMany({
      where: eq(matchesTable.teamId, teamId),
      orderBy: [desc(matchesTable.kickoffAt)],
    }),
    tdb.tournaments.findMany({ orderBy: [asc(tournamentsTable.name)] }),
  ]);

  const teamOption = [{ value: team.id, label: team.name }];
  const tournamentOptions = tournaments.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/coach"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mis equipos
      </Link>

      <PageHeader
        eyebrow={team.category ? team.category.name : "Equipo"}
        title={team.name}
        subtitle={`${students.length} alumno${students.length === 1 ? "" : "s"}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="order-2 space-y-6 lg:order-1">
          <section>
            <h2 className="mb-2 font-display text-lg font-bold">Sesiones</h2>
            {sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-5 text-center text-sm text-ink-soft">
                Sin sesiones. Crea una aquí al lado.
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/coach/sesiones/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 text-sm shadow-sm transition hover:border-pitch/30"
                    >
                      <span className="min-w-0 truncate">
                        {s.title}
                        <span className="ml-2 text-xs text-ink-soft">
                          {SESSION_KIND_LABELS[s.kind as SessionKind]} ·{" "}
                          {formatKickoff(s.startsAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-ink-soft">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-bold">Partidos</h2>
            {matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-5 text-center text-sm text-ink-soft">
                Sin partidos. Agenda uno aquí al lado.
              </p>
            ) : (
              <ul className="space-y-2">
                {matches.slice(0, 8).map((m) => {
                  const r = resultOf(m.ourScore, m.opponentScore);
                  const tone =
                    r === "win" ? "text-pitch" : r === "loss" ? "text-red-600" : "text-ink";
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/coach/partidos/${m.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 text-sm shadow-sm transition hover:border-pitch/30"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-ink-soft">{m.isHome ? "vs" : "@"}</span>{" "}
                          {m.opponentName}
                          <span className="ml-2 text-xs text-ink-soft">
                            {formatKickoff(m.kickoffAt)}
                          </span>
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
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Plantel</h2>
            {students.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-5 text-center text-sm text-ink-soft">
                Este equipo aún no tiene alumnos.
              </p>
            ) : (
              <StudentList students={students} showBadges={false} />
            )}
          </section>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nueva sesión</p>
            <CreateSessionForm teams={teamOption} />
          </Card>
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nuevo partido</p>
            <CreateMatchForm teams={teamOption} tournaments={tournamentOptions} />
          </Card>
        </div>
      </div>
    </div>
  );
}
