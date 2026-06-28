import Link from "next/link";
import { and, gte, lt } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  trainingSessions as sessionsTable,
  matches as matchesTable,
} from "@/db/schema";
import {
  startOfMonth,
  addMonths,
  startOfWeek,
  addDays,
  monthLabel,
  toDayKey,
  formatTime,
} from "@/lib/calendar";
import { PageHeader } from "@/components/ui";
import { MonthCalendar, type CalEvent, type DayCell } from "./month-calendar";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const { m } = await searchParams;
  const offset = Number.parseInt(m ?? "0", 10) || 0;

  const today = new Date();
  const base = addMonths(startOfMonth(today), offset); // primer día del mes mostrado
  const gridStart = startOfWeek(base); // lunes de la primera semana visible
  const gridEnd = addDays(gridStart, 42); // 6 semanas

  const [sessions, matches] = await Promise.all([
    tdb.sessions.findMany({
      where: and(
        gte(sessionsTable.startsAt, gridStart),
        lt(sessionsTable.startsAt, gridEnd)
      ),
      with: { team: true },
    }),
    tdb.matches.findMany({
      where: and(
        gte(matchesTable.kickoffAt, gridStart),
        lt(matchesTable.kickoffAt, gridEnd)
      ),
      with: { team: true },
    }),
  ]);

  const events: CalEvent[] = [
    ...sessions.map((s) => ({
      id: s.id,
      dayKey: toDayKey(s.startsAt),
      time: formatTime(s.startsAt),
      type: s.kind as "training" | "event",
      title: s.title,
      subtitle: `${s.team.name}${s.location ? ` · ${s.location}` : ""}`,
      href: `/admin/asistencias/${s.id}`,
    })),
    ...matches.map((mt) => ({
      id: mt.id,
      dayKey: toDayKey(mt.kickoffAt),
      time: formatTime(mt.kickoffAt),
      type: "match" as const,
      title: `${mt.team.name} ${mt.isHome ? "vs" : "@"} ${mt.opponentName}`,
      subtitle: mt.location ? mt.location : "Partido",
      href: `/admin/partidos/${mt.id}`,
    })),
  ];

  const todayKey = toDayKey(today);
  const days: DayCell[] = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    return {
      key: toDayKey(d),
      num: d.getDate(),
      inMonth: d.getMonth() === base.getMonth(),
      isToday: toDayKey(d) === todayKey,
    };
  });

  // Día seleccionado por defecto: hoy si el mes mostrado es el actual; si no, el día 1.
  const defaultSelected =
    base.getMonth() === today.getMonth() &&
    base.getFullYear() === today.getFullYear()
      ? todayKey
      : toDayKey(base);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Calendario"
        title="Calendario"
        subtitle="Entrenamientos, eventos y partidos. Toca un día para ver su detalle."
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/admin/calendario?m=${offset - 1}`}
          className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
          aria-label="Mes anterior"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="font-display text-base font-bold text-ink">
            {monthLabel(base)}
          </p>
          {offset !== 0 && (
            <Link
              href="/admin/calendario"
              className="text-xs font-medium text-pitch hover:underline"
            >
              Ir a hoy
            </Link>
          )}
        </div>
        <Link
          href={`/admin/calendario?m=${offset + 1}`}
          className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
          aria-label="Mes siguiente"
        >
          →
        </Link>
      </div>

      <MonthCalendar
        days={days}
        events={events}
        defaultSelected={defaultSelected}
      />
    </div>
  );
}
