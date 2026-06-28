import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireRole } from "@/lib/tenant";
import { assertTeamAccess } from "@/lib/coach";
import { tenantDb } from "@/lib/tenant-db";
import {
  students as studentsTable,
  trainingSessions as sessionsTable,
} from "@/db/schema";
import { formatKickoff } from "@/lib/competition";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { PageHeader, Card } from "@/components/ui";
import { AttendanceForm } from "@/app/admin/asistencias/[id]/attendance-form";

export default async function CoachSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(["coach"]);
  const tdb = tenantDb(membership.schoolId);

  const session = await tdb.sessions.findFirst({
    where: eq(sessionsTable.id, id),
    with: { team: true, attendance: true },
  });
  if (!session) notFound();
  await assertTeamAccess(membership, session.teamId);

  const roster = await tdb.students.findMany({
    where: and(
      eq(studentsTable.teamId, session.teamId),
      eq(studentsTable.status, "active")
    ),
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
    columns: { id: true, firstName: true, lastName: true },
  });

  const byStudent = new Map(session.attendance.map((a) => [a.studentId, a] as const));
  const players = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    status: byStudent.get(s.id)?.status ?? "present",
    note: byStudent.get(s.id)?.note ?? "",
  }));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={`/coach/equipos/${session.teamId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {session.team.name}
      </Link>

      <PageHeader
        eyebrow={SESSION_KIND_LABELS[session.kind as SessionKind]}
        title={session.title}
        subtitle={`${session.team.name} · ${formatKickoff(session.startsAt)}${
          session.location ? ` · ${session.location}` : ""
        }`}
      />

      <Card>
        {players.length === 0 ? (
          <p className="text-center text-sm text-ink-soft">
            El equipo no tiene alumnos activos.
          </p>
        ) : (
          <AttendanceForm sessionId={session.id} players={players} />
        )}
      </Card>
    </div>
  );
}
