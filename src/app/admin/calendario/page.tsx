import Link from "next/link";
import { and, gte, lt } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  trainingSessions as sessionsTable,
  matches as matchesTable,
} from "@/db/schema";
import {
  startOfWeek,
  addDays,
  weekDays,
  weekRangeLabel,
  dayHeading,
  formatTime,
  isSameDay,
} from "@/lib/calendar";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { PageHeader } from "@/components/ui";

type CalEvent = {
  id: string;
  at: Date;
  type: "training" | "event" | "match";
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_DOT: Record<CalEvent["type"], string> = {
  training: "bg-pitch",
  event: "bg-amber-500",
  match: "bg-sky-500",
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const { w } = await searchParams;
  const offset = Number.parseInt(w ?? "0", 10) || 0;

  const today = new Date();
  const weekStart = addDays(startOfWeek(today), offset * 7);
  const weekEnd = addDays(weekStart, 7);

  const [sessions, matches] = await Promise.all([
    tdb.sessions.findMany({
      where: and(
        gte(sessionsTable.startsAt, weekStart),
        lt(sessionsTable.startsAt, weekEnd)
      ),
      with: { team: true },
    }),
    tdb.matches.findMany({
      where: and(
        gte(matchesTable.kickoffAt, weekStart),
        lt(matchesTable.kickoffAt, weekEnd)
      ),
      with: { team: true },
    }),
  ]);

  const events: CalEvent[] = [
    ...sessions.map((s) => ({
      id: s.id,
      at: s.startsAt,
      type: s.kind as "training" | "event",
      title: s.title,
      subtitle: `${SESSION_KIND_LABELS[s.kind as SessionKind]} · ${s.team.name}${
        s.location ? ` · ${s.location}` : ""
      }`,
      href: `/admin/asistencias/${s.id}`,
    })),
    ...matches.map((m) => ({
      id: m.id,
      at: m.kickoffAt,
      type: "match" as const,
      title: `${m.team.name} ${m.isHome ? "vs" : "@"} ${m.opponentName}`,
      subtitle: `Partido${m.location ? ` · ${m.location}` : ""}`,
      href: `/admin/partidos/${m.id}`,
    })),
  ];

  const days = weekDays(weekStart);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Calendario"
        title="Calendario semanal"
        subtitle="Entrenamientos, eventos y partidos de la semana."
      />

      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/admin/calendario?w=${offset - 1}`}
          className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          ← Anterior
        </Link>
        <div className="text-center">
          <p className="font-display text-sm font-bold text-ink">
            {weekRangeLabel(weekStart)}
          </p>
          {offset !== 0 && (
            <Link
              href="/admin/calendario"
              className="text-xs font-medium text-pitch hover:underline"
            >
              Ir a esta semana
            </Link>
          )}
        </div>
        <Link
          href={`/admin/calendario?w=${offset + 1}`}
          className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          Siguiente →
        </Link>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => isSameDay(e.at, day))
            .sort((a, b) => a.at.getTime() - b.at.getTime());
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`rounded-2xl border bg-white/80 p-4 shadow-sm ${
                isToday ? "border-pitch/40" : "border-ink/10"
              }`}
            >
              <p className="mb-2 text-sm font-semibold capitalize text-ink">
                {dayHeading(day)}
                {isToday && (
                  <span className="ml-2 rounded-full bg-pitch/10 px-2 py-0.5 text-xs font-medium text-pitch">
                    Hoy
                  </span>
                )}
              </p>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-ink-soft/70">Sin actividades.</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayEvents.map((e) => (
                    <li key={`${e.type}-${e.id}`}>
                      <Link
                        href={e.href}
                        className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-chalk-deep"
                      >
                        <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-soft">
                          {formatTime(e.at)}
                        </span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[e.type]}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {e.title}
                          </span>
                          <span className="block truncate text-xs text-ink-soft">
                            {e.subtitle}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
