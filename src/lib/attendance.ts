import type { attendanceStatus, sessionKind } from "@/db/schema";

export type AttendanceStatus = (typeof attendanceStatus.enumValues)[number];
export type SessionKind = (typeof sessionKind.enumValues)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Retardo",
  excused: "Justificado",
};

/** Orden y opciones para los selects del pase de lista. */
export const ATTENDANCE_STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
}[] = (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map(
  (value) => ({ value, label: ATTENDANCE_STATUS_LABELS[value] })
);

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  training: "Entrenamiento",
  event: "Evento",
};

/**
 * Cuenta como "asistió" para el % de asistencia: presente o con retardo.
 * (Justificado y ausente no suman.)
 */
export function countsAsPresent(status: AttendanceStatus): boolean {
  return status === "present" || status === "late";
}

/** % de asistencia (0–100) dado el total de sesiones y las asistidas. */
export function attendanceRate(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}
