import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";

import {
  teams as teamsTable,
  students as studentsTable,
  matches as matchesTable,
} from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  teamRecord,
  formatKickoff,
  scoreLabel,
  resultOf,
  MATCH_STATUS_LABELS,
  type MatchStatus,
} from "@/lib/competition";
import { getTeamCoaches } from "@/lib/coach";
import { getTeamStaffInvitations } from "@/lib/staff-invitations";
import { PageHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { StudentList } from "@/components/student-list";
import { CoachAssign } from "./coach-assign";

export default async function EquipoDetallePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);

  const tdb = tenantDb(membership.schoolId);
  const team = await tdb.teams.findFirst({
    where: eq(teamsTable.id, teamId),
    with: { category: true },
  });
  if (!team) notFound();

  const students = await tdb.students.findMany({
    where: eq(studentsTable.teamId, teamId),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  const matches = await tdb.matches.findMany({
    where: eq(matchesTable.teamId, teamId),
    orderBy: [desc(matchesTable.kickoffAt)],
  });
  const record = teamRecord(matches);

  const [coaches, staffInvitations] = await Promise.all([
    getTeamCoaches(teamId),
    getTeamStaffInvitations(teamId),
  ]);

  const ages = students
    .map((s) => (s.birthDate ? ageFromISO(s.birthDate) : null))
    .filter((a): a is number => a !== null);
  const avgAge = ages.length
    ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
    : null;

  const nuevoHref = `/admin/alumnos/nuevo?team=${team.id}`;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/admin/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5M11 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Equipos
      </Link>

      <PageHeader
        eyebrow={team.category ? team.category.name : "Equipo"}
        title={
          <span className="inline-flex items-center gap-2.5">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: team.color || "var(--color-pitch)" }}
            />
            {team.name}
          </span>
        }
        subtitle={
          students.length
            ? `${students.length} alumno${students.length === 1 ? "" : "s"} en este equipo.`
            : "Este equipo aún no tiene alumnos."
        }
        action={<PrimaryLink href={nuevoHref}>Agregar alumno</PrimaryLink>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {students.length > 0 && (
          <>
            <Stat label="Alumnos" value={String(students.length)} />
            {avgAge !== null && <Stat label="Edad promedio" value={`${avgAge} años`} />}
          </>
        )}
        {record.pj > 0 && (
          <>
            <Stat label="Jugados" value={String(record.pj)} />
            <Stat label="Récord (G-E-P)" value={`${record.w}-${record.d}-${record.l}`} />
            <Stat label="Goles (F:C)" value={`${record.gf}:${record.ga}`} />
            <Stat label="Puntos" value={String(record.pts)} />
          </>
        )}
      </div>

      <div className="mb-6">
        <CoachAssign
          teamId={team.id}
          coaches={coaches.map((c) => ({ id: c.id, user: c.user }))}
          invitations={staffInvitations.map((i) => ({
            id: i.id,
            token: i.token,
            email: i.email,
            status: i.status,
            acceptedByName: i.acceptedBy?.name ?? null,
          }))}
        />
      </div>

      {/* Partidos del equipo */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Partidos</h2>
          <Link
            href="/admin/partidos"
            className="text-sm font-medium text-pitch hover:text-pitch-deep"
          >
            Agendar / ver todos
          </Link>
        </div>
        {matches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-5 text-center text-sm text-ink-soft">
            Este equipo aún no tiene partidos.
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.slice(0, 6).map((m) => {
              const r = resultOf(m.ourScore, m.opponentScore);
              const tone =
                r === "win" ? "text-pitch" : r === "loss" ? "text-red-600" : "text-ink";
              return (
                <li key={m.id}>
                  <Link
                    href={`/admin/partidos/${m.id}`}
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
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Plantel</h2>
      {students.length === 0 ? (
        <EmptyState
          title="Sin alumnos en este equipo"
          description="Agrega alumnos a este equipo; quedarán asignados automáticamente."
          action={<PrimaryLink href={nuevoHref}>Agregar alumno</PrimaryLink>}
        />
      ) : (
        <StudentList students={students} showBadges={false} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 shadow-sm">
      <span className="text-xs text-ink-soft">{label}</span>
      <p className="font-display text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

/** Edad en años a partir de una fecha ISO "YYYY-MM-DD". */
function ageFromISO(iso: string): number {
  const b = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
