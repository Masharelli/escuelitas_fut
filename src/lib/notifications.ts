import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications, guardianships, students } from "@/db/schema";
import { sendEmail, renderEmail, emailEnabled } from "@/lib/email";

export type NotificationType =
  | "charge_created"
  | "charge_paid"
  | "charge_due_soon"
  | "charge_overdue"
  | "match_upcoming"
  | "match_result"
  | "general";

export type NotifyPayload = {
  schoolId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Ruta relativa del portal (ej. "/padres/pagos"). */
  link?: string | null;
};

export type Recipient = { userId: string; email?: string | null };

// ---------------------------------------------------------------------------
// Destinatarios
// ---------------------------------------------------------------------------

/** Tutores (userId + email) vinculados a un alumno. */
export async function guardiansOfStudent(
  studentId: string
): Promise<Recipient[]> {
  const rows = await db.query.guardianships.findMany({
    where: eq(guardianships.studentId, studentId),
    with: { user: { columns: { id: true, email: true } } },
  });
  return rows.map((r) => ({ userId: r.user.id, email: r.user.email }));
}

/** Mapa studentId → tutores, en UNA sola consulta (para lotes de cargos). */
export async function guardiansOfStudents(
  studentIds: string[]
): Promise<Map<string, Recipient[]>> {
  const map = new Map<string, Recipient[]>();
  if (studentIds.length === 0) return map;
  const rows = await db.query.guardianships.findMany({
    where: inArray(guardianships.studentId, studentIds),
    with: { user: { columns: { id: true, email: true } } },
  });
  for (const r of rows) {
    const list = map.get(r.studentId) ?? [];
    list.push({ userId: r.user.id, email: r.user.email });
    map.set(r.studentId, list);
  }
  return map;
}

/** Tutores de TODOS los alumnos de un equipo, sin repetir usuario. */
export async function guardiansOfTeam(teamId: string): Promise<Recipient[]> {
  const roster = await db.query.students.findMany({
    where: eq(students.teamId, teamId),
    columns: { id: true },
  });
  const byStudent = await guardiansOfStudents(roster.map((s) => s.id));
  const seen = new Map<string, Recipient>();
  for (const list of byStudent.values()) {
    for (const r of list) seen.set(r.userId, r);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Emisión
// ---------------------------------------------------------------------------

/**
 * Crea avisos in-app para varios destinatarios (un solo INSERT) y, si el correo
 * está configurado, lo envía en paralelo (best-effort). No lanza por el correo.
 */
export async function notifyUsers(
  recipients: Recipient[],
  payload: NotifyPayload
): Promise<void> {
  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((r) => ({
      schoolId: payload.schoolId,
      userId: r.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
    }))
  );

  if (emailEnabled()) {
    const html = renderEmail(payload.title, payload.body, payload.link);
    await Promise.allSettled(
      recipients
        .filter((r) => r.email)
        .map((r) =>
          sendEmail({ to: r.email as string, subject: payload.title, html })
        )
    );
  }
}

/** Avisa a los tutores de un alumno. */
export async function notifyStudentGuardians(
  studentId: string,
  payload: NotifyPayload
): Promise<void> {
  await notifyUsers(await guardiansOfStudent(studentId), payload);
}

// ---------------------------------------------------------------------------
// Lectura (portal)
// ---------------------------------------------------------------------------

export async function getMyNotifications(userId: string, limit = 40) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.n ?? 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
