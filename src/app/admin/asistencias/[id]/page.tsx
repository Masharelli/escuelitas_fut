import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  students as studentsTable,
  trainingSessions as sessionsTable,
} from "@/db/schema";
import { formatKickoff } from "@/lib/competition";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { getCallupsForSession, type RsvpStatus } from "@/lib/callups";
import { PageHeader, Card } from "@/components/ui";
import { CallupManager } from "@/components/callup-manager";
import { AttendanceForm } from "./attendance-form";
import { deleteSession } from "../actions";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const session = await tdb.sessions.findFirst({
    where: eq(sessionsTable.id, id),
    with: { team: true, attendance: true },
  });
  if (!session) notFound();

  // Alumnos activos del equipo, con su estado actual (si ya se tomó lista).
  const roster = await tdb.students.findMany({
    where: and(
      eq(studentsTable.teamId, session.teamId),
      eq(studentsTable.status, "active")
    ),
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
    columns: { id: true, firstName: true, lastName: true },
  });

  const byStudent = new Map(
    session.attendance.map((a) => [a.studentId, a] as const)
  );
  const players = roster.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    status: byStudent.get(s.id)?.status ?? "present",
    note: byStudent.get(s.id)?.note ?? "",
  }));

  // Convocatoria de la sesión (Fase C).
  const callupRows = await getCallupsForSession(membership.schoolId, session.id);
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
        href="/admin/asistencias"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Asistencias
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
            El equipo no tiene alumnos activos. Asigna alumnos al equipo para
            tomar lista.
          </p>
        ) : (
          <AttendanceForm sessionId={session.id} players={players} />
        )}
      </Card>

      {callupPlayers.length > 0 && (
        <Card className="mt-4">
          <p className="mb-3 text-sm font-semibold text-ink">Convocatoria</p>
          <CallupManager
            target="session"
            targetId={session.id}
            players={callupPlayers}
          />
        </Card>
      )}

      <div className="mt-4 flex items-center">
        <form action={deleteSession} className="ml-auto">
          <input type="hidden" name="sessionId" value={session.id} />
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
          >
            Eliminar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
