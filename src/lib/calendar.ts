/**
 * Helpers de fecha para la agenda semanal (Fase B). Funciones puras: operan
 * sobre la fecha que reciben; el "hoy" lo calcula quien las llama (en un server
 * component, con `new Date()`), nunca aquí.
 */

const MS_DAY = 24 * 60 * 60 * 1000;

/** Lunes 00:00 (hora local) de la semana que contiene a `d`. */
export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=domingo … 6=sábado
  const diff = (day + 6) % 7; // días desde el lunes
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return monday;
}

/** Nueva fecha desplazada `n` días (puede ser negativo). */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_DAY);
}

/** Los 7 días (lunes→domingo) de la semana que arranca en `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "lun 23 jun" */
export function dayHeading(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** "10:00" */
export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Rótulo del rango de la semana, ej. "23 – 29 jun 2026". */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date, withMonth: boolean) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      ...(withMonth ? { month: "short" } : {}),
    }).format(d);
  const year = end.getFullYear();
  // Si ambos extremos caen en el mismo mes, no repetir el mes en el inicio.
  const sameMonth = weekStart.getMonth() === end.getMonth();
  return `${fmt(weekStart, !sameMonth)} – ${fmt(end, true)} ${year}`;
}

/** Primer día del mes (00:00 local) que contiene a `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Nueva fecha desplazada `n` meses (al día 1). */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** "junio 2026" (mes y año). */
export function monthLabel(d: Date): string {
  const s = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Clave de día estable "YYYY-MM-DD" en hora local (para agrupar sin líos de TZ). */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Encabezados de la semana (lunes→domingo). */
export const WEEKDAY_HEADERS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** ¿Es `d` el mismo día (local) que `ref`? */
export function isSameDay(d: Date, ref: Date): boolean {
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}
