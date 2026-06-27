import Link from "next/link";
import { asc, desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  trainingSessions as sessionsTable,
  teams as teamsTable,
} from "@/db/schema";
import { formatKickoff } from "@/lib/competition";
import {
  SESSION_KIND_LABELS,
  countsAsPresent,
  type SessionKind,
} from "@/lib/attendance";
import { PageHeader, Card } from "@/components/ui";
import { CreateSessionForm } from "./forms";

export default async function AsistenciasPage() {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const [sessions, teams] = await Promise.all([
    tdb.sessions.findMany({
      with: { team: true, attendance: { columns: { status: true } } },
      orderBy: [desc(sessionsTable.startsAt)],
    }),
    tdb.teams.findMany({ orderBy: [asc(teamsTable.name)] }),
  ]);

  const now = new Date().getTime();
  const upcoming = sessions
    .filter((s) => s.startsAt.getTime() >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = sessions.filter((s) => s.startsAt.getTime() < now);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Asistencias"
        title="Asistencias"
        subtitle="Programa entrenamientos y eventos, y toma el pase de lista."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <h2 className="font-display text-lg font-bold">Próximas</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              No hay sesiones programadas. Crea una aquí al lado.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          )}

          <h2 className="mt-8 font-display text-lg font-bold">Anteriores</h2>
          {past.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Aún no hay sesiones pasadas.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {past.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nueva sesión</p>
            <CreateSessionForm teams={teamOptions} />
          </Card>
        </div>
      </div>
    </div>
  );
}

type Row = {
  id: string;
  title: string;
  kind: string;
  startsAt: Date;
  location: string | null;
  team: { name: string };
  attendance: { status: string }[];
};

function SessionRow({ session: s }: { session: Row }) {
  const taken = s.attendance.length;
  const present = s.attendance.filter((a) =>
    countsAsPresent(a.status as "present" | "absent" | "late" | "excused")
  ).length;

  return (
    <li>
      <Link
        href={`/admin/asistencias/${s.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30 hover:shadow"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {s.title}{" "}
            <span className="text-ink-soft">· {s.team.name}</span>
          </p>
          <p className="truncate text-xs text-ink-soft">
            {SESSION_KIND_LABELS[s.kind as SessionKind]} ·{" "}
            {formatKickoff(s.startsAt)}
            {s.location ? ` · ${s.location}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {taken > 0 ? (
            <span className="font-display text-sm font-bold text-pitch">
              {present}/{taken}
            </span>
          ) : (
            <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              Sin pase de lista
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
