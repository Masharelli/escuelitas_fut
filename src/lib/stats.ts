import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { matchPlayerStats, attendance } from "@/db/schema";
import { countsAsPresent, attendanceRate, type AttendanceStatus } from "@/lib/attendance";

export type StudentStats = {
  matchesPlayed: number; // partidos con participación registrada
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  sessionsTotal: number; // sesiones con pase de lista tomado
  sessionsPresent: number; // presentes o con retardo
  attendanceRate: number; // 0–100
};

/**
 * Estadísticas acumuladas de un alumno dentro de su escuela: aporte en partidos
 * (de match_player_stats) y asistencia a entrenamientos (de attendance).
 */
export async function getStudentStats(
  schoolId: string,
  studentId: string
): Promise<StudentStats> {
  const [matchRows, attendanceRows] = await Promise.all([
    db.query.matchPlayerStats.findMany({
      where: and(
        eq(matchPlayerStats.schoolId, schoolId),
        eq(matchPlayerStats.studentId, studentId)
      ),
    }),
    db.query.attendance.findMany({
      where: and(
        eq(attendance.schoolId, schoolId),
        eq(attendance.studentId, studentId)
      ),
      columns: { status: true },
    }),
  ]);

  const totals = matchRows.reduce(
    (acc, r) => {
      acc.goals += r.goals;
      acc.assists += r.assists;
      acc.yellowCards += r.yellowCards;
      acc.redCards += r.redCards;
      acc.minutesPlayed += r.minutesPlayed;
      return acc;
    },
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 0 }
  );

  const sessionsPresent = attendanceRows.filter((a) =>
    countsAsPresent(a.status as AttendanceStatus)
  ).length;

  return {
    matchesPlayed: matchRows.length,
    ...totals,
    sessionsTotal: attendanceRows.length,
    sessionsPresent,
    attendanceRate: attendanceRate(sessionsPresent, attendanceRows.length),
  };
}
