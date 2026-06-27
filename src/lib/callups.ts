import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { callups, guardianships } from "@/db/schema";

export type RsvpStatus = "pending" | "yes" | "no";

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Pendiente",
  yes: "Asistirá",
  no: "No asistirá",
};

type CallupTarget = { schoolId: string; matchId?: string; sessionId?: string };

/** `where` que aísla las convocatorias de un evento (partido o sesión). */
function targetWhere(target: CallupTarget) {
  const bySchool = eq(callups.schoolId, target.schoolId);
  if (target.matchId) {
    return and(bySchool, eq(callups.matchId, target.matchId));
  }
  return and(bySchool, eq(callups.sessionId, target.sessionId!));
}

/**
 * Ajusta la convocatoria de un evento a la lista `studentIds`: agrega a los
 * nuevos (rsvp "pending"), quita a los desconvocados y NO toca a los que ya
 * estaban (conserva su respuesta). Devuelve los `studentId` recién agregados
 * (para avisar solo a esos tutores).
 */
export async function setCallups(
  target: CallupTarget,
  studentIds: string[]
): Promise<{ addedStudentIds: string[] }> {
  const existing = await db.query.callups.findMany({
    where: targetWhere(target),
    columns: { id: true, studentId: true },
  });
  const existingIds = new Set(existing.map((c) => c.studentId));
  const wanted = new Set(studentIds);

  const toAdd = studentIds.filter((id) => !existingIds.has(id));
  const toRemoveIds = existing
    .filter((c) => !wanted.has(c.studentId))
    .map((c) => c.id);

  if (toRemoveIds.length > 0) {
    await db.delete(callups).where(inArray(callups.id, toRemoveIds));
  }
  if (toAdd.length > 0) {
    await db.insert(callups).values(
      toAdd.map((studentId) => ({
        schoolId: target.schoolId,
        matchId: target.matchId ?? null,
        sessionId: target.sessionId ?? null,
        studentId,
      }))
    );
  }

  return { addedStudentIds: toAdd };
}

/** Convocatoria de un partido, con datos del alumno (para la UI del coach). */
export async function getCallupsForMatch(schoolId: string, matchId: string) {
  return db.query.callups.findMany({
    where: and(eq(callups.schoolId, schoolId), eq(callups.matchId, matchId)),
    with: { student: { columns: { id: true, firstName: true, lastName: true } } },
  });
}

/** Convocatoria de una sesión, con datos del alumno. */
export async function getCallupsForSession(
  schoolId: string,
  sessionId: string
) {
  return db.query.callups.findMany({
    where: and(
      eq(callups.schoolId, schoolId),
      eq(callups.sessionId, sessionId)
    ),
    with: { student: { columns: { id: true, firstName: true, lastName: true } } },
  });
}

/** Resumen de respuestas de una lista de convocatorias. */
export function summarizeRsvp(rows: { rsvp: string }[]) {
  const out = { yes: 0, no: 0, pending: 0, total: rows.length };
  for (const r of rows) {
    if (r.rsvp === "yes") out.yes++;
    else if (r.rsvp === "no") out.no++;
    else out.pending++;
  }
  return out;
}

/**
 * Convocatorias de los hijos del usuario (para el portal de padres), con el
 * partido o la sesión a la que pertenecen. La página filtra por tipo.
 */
export async function getMyChildrenCallups(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    columns: { studentId: true },
  });
  const studentIds = links.map((l) => l.studentId);
  if (studentIds.length === 0) return [];

  return db.query.callups.findMany({
    where: inArray(callups.studentId, studentIds),
    with: {
      student: { columns: { id: true, firstName: true, lastName: true } },
      match: { with: { team: true } },
      session: { with: { team: true } },
    },
    orderBy: [desc(callups.createdAt)],
  });
}

/**
 * Respuesta del tutor a una convocatoria. Verifica que la convocatoria sea de
 * un hijo del usuario antes de escribir. Devuelve true si se aplicó.
 */
export async function respondToCallup(
  userId: string,
  callupId: string,
  rsvp: RsvpStatus
): Promise<boolean> {
  const callup = await db.query.callups.findFirst({
    where: eq(callups.id, callupId),
    columns: { id: true, studentId: true },
  });
  if (!callup) return false;

  const link = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, callup.studentId)
    ),
  });
  if (!link) return false;

  await db
    .update(callups)
    .set({ rsvp, respondedAt: new Date() })
    .where(eq(callups.id, callupId));
  return true;
}
