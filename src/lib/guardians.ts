import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  students,
  guardianships,
  memberships,
  matches,
  tournaments,
  trainingSessions,
  autopay,
} from "@/db/schema";

/**
 * Vincula al usuario con los alumnos cuyo "correo del tutor" coincide con el
 * suyo, y le da una membresía de "padre" en esas escuelas. Es idempotente
 * (no duplica vínculos ni membresías), así que es seguro llamarla en cada
 * carga del portal.
 */
export async function claimStudentsByEmail(
  userId: string,
  email?: string | null
) {
  if (!email) return;
  const e = email.toLowerCase();

  const matched = await db
    .select({ id: students.id, schoolId: students.schoolId })
    .from(students)
    .where(sql`lower(${students.guardianEmail}) = ${e}`);

  for (const s of matched) {
    await db
      .insert(guardianships)
      .values({ userId, studentId: s.id })
      .onConflictDoNothing();

    // Membresía de padre en la escuela del alumno (si no la tiene ya, p. ej.
    // como owner/admin, no se toca por el conflicto).
    await db
      .insert(memberships)
      .values({ userId, schoolId: s.schoolId, role: "parent" })
      .onConflictDoNothing();
  }
}

/** Hijos vinculados al usuario, con su categoría, equipo y escuela. */
export async function getMyChildren(userId: string) {
  const rows = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    with: {
      student: { with: { category: true, team: true, tenant: true } },
    },
  });
  return rows.map((r) => r.student);
}

/**
 * Partidos de los equipos de los hijos del usuario (más recientes primero).
 * Frontera correcta del portal de padres: solo ve partidos de los equipos
 * donde juegan sus hijos.
 */
export async function getMyChildrenMatches(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    with: { student: { columns: { teamId: true } } },
  });
  const teamIds = [
    ...new Set(
      links.map((l) => l.student.teamId).filter((id): id is string => !!id)
    ),
  ];
  if (teamIds.length === 0) return [];

  return db.query.matches.findMany({
    where: inArray(matches.teamId, teamIds),
    with: { team: true },
    orderBy: [desc(matches.kickoffAt)],
  });
}

/**
 * Entrenamientos / eventos de los equipos de los hijos del usuario (más
 * recientes primero). Misma frontera que los partidos: solo ve sesiones de los
 * equipos donde juegan sus hijos.
 */
export async function getMyChildrenSessions(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    with: { student: { columns: { teamId: true } } },
  });
  const teamIds = [
    ...new Set(
      links.map((l) => l.student.teamId).filter((id): id is string => !!id)
    ),
  ];
  if (teamIds.length === 0) return [];

  return db.query.trainingSessions.findMany({
    where: inArray(trainingSessions.teamId, teamIds),
    with: { team: true },
    orderBy: [desc(trainingSessions.startsAt)],
  });
}

/**
 * Torneos (con su tabla de posiciones) en los que juegan los equipos de los
 * hijos del usuario. Para mostrar la tabla a los padres en modo lectura.
 */
export async function getMyChildrenTournaments(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    with: { student: { columns: { teamId: true } } },
  });
  const teamIds = [
    ...new Set(
      links.map((l) => l.student.teamId).filter((id): id is string => !!id)
    ),
  ];
  if (teamIds.length === 0) return [];

  const teamMatches = await db.query.matches.findMany({
    where: inArray(matches.teamId, teamIds),
    columns: { tournamentId: true },
  });
  const tournamentIds = [
    ...new Set(
      teamMatches
        .map((m) => m.tournamentId)
        .filter((id): id is string => !!id)
    ),
  ];
  if (tournamentIds.length === 0) return [];

  return db.query.tournaments.findMany({
    where: inArray(tournaments.id, tournamentIds),
    with: { standings: true },
  });
}

/** Estado de pago automático por hijo: Map studentId → status. */
export async function getMyChildrenAutopay(userId: string) {
  const links = await db.query.guardianships.findMany({
    where: eq(guardianships.userId, userId),
    columns: { studentId: true },
  });
  const ids = links.map((l) => l.studentId);
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db.query.autopay.findMany({
    where: inArray(autopay.studentId, ids),
  });
  return new Map(rows.map((r) => [r.studentId, r.status] as const));
}

/**
 * Tutores (usuarios) de los alumnos de un equipo, sin repetir, para elegir al
 * "papá estadístico" de un partido. Devuelve [{ id, name, email }].
 */
export async function getTeamGuardianUsers(teamId: string) {
  const roster = await db.query.students.findMany({
    where: eq(students.teamId, teamId),
    columns: { id: true },
  });
  const ids = roster.map((s) => s.id);
  if (ids.length === 0) return [] as { id: string; name: string | null; email: string | null }[];

  const links = await db.query.guardianships.findMany({
    where: inArray(guardianships.studentId, ids),
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
  const seen = new Map<string, { id: string; name: string | null; email: string | null }>();
  for (const l of links) seen.set(l.user.id, l.user);
  return [...seen.values()];
}

/** Un hijo específico del usuario (o null si no le pertenece). */
export async function getMyChild(userId: string, studentId: string) {
  const row = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, studentId)
    ),
    with: {
      student: { with: { category: true, team: true, tenant: true } },
    },
  });
  return row?.student ?? null;
}
