"use client";

import { useState } from "react";
import Link from "next/link";

import { WEEKDAY_HEADERS } from "@/lib/calendar";

export type CalEvent = {
  id: string;
  dayKey: string;
  time: string;
  type: "training" | "event" | "match";
  title: string;
  subtitle: string;
  href: string;
};

export type DayCell = {
  key: string;
  num: number;
  inMonth: boolean;
  isToday: boolean;
};

const TYPE_DOT: Record<CalEvent["type"], string> = {
  training: "bg-pitch",
  event: "bg-amber-500",
  match: "bg-sky-500",
};

const TYPE_LABEL: Record<CalEvent["type"], string> = {
  training: "Entrenamiento",
  event: "Evento",
  match: "Partido",
};

export function MonthCalendar({
  days,
  events,
  defaultSelected,
}: {
  days: DayCell[];
  events: CalEvent[];
  defaultSelected: string;
}) {
  const [selected, setSelected] = useState(defaultSelected);

  // Eventos agrupados por día.
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.dayKey) ?? [];
    list.push(e);
    byDay.set(e.dayKey, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.time.localeCompare(b.time));

  const selectedEvents = byDay.get(selected) ?? [];

  // 7 columnas fijas vía estilo inline (no depende de que Tailwind genere
  // la utilidad grid-cols-7).
  const sevenCols = { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" } as const;

  return (
    <div>
      {/* Encabezados de día */}
      <div
        className="mb-1 grid gap-1 text-center text-xs font-medium text-ink-soft"
        style={sevenCols}
      >
        {WEEKDAY_HEADERS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Grid del mes */}
      <div className="grid gap-1" style={sevenCols}>
        {days.map((d) => {
          const dayEvents = byDay.get(d.key) ?? [];
          const isSel = d.key === selected;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(d.key)}
              aria-pressed={isSel}
              className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1 text-sm transition sm:p-1.5 ${
                isSel
                  ? "border-pitch bg-pitch/10"
                  : "border-ink/10 bg-white/70 hover:border-pitch/30"
              } ${d.inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  d.isToday ? "bg-pitch text-chalk" : "text-ink"
                }`}
              >
                {d.num}
              </span>
              {dayEvents.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[e.type]}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] leading-none text-ink-soft">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <Legend cls={TYPE_DOT.training} label="Entrenamiento" />
        <Legend cls={TYPE_DOT.event} label="Evento" />
        <Legend cls={TYPE_DOT.match} label="Partido" />
      </div>

      {/* Detalle del día seleccionado */}
      <div className="mt-5">
        <h2 className="mb-2 font-display text-lg font-bold">
          {formatSelected(selected)}
        </h2>
        {selectedEvents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-5 text-center text-sm text-ink-soft">
            Sin actividades este día.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selectedEvents.map((e) => (
              <li key={`${e.type}-${e.id}`}>
                <Link
                  href={e.href}
                  className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 shadow-sm transition hover:border-pitch/30"
                >
                  <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-soft">
                    {e.time}
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
                      {TYPE_LABEL[e.type]} · {e.subtitle}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      {label}
    </span>
  );
}

/** "lun 23 jun" a partir de "YYYY-MM-DD" (sin crear Date con TZ shift). */
function formatSelected(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const s = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
