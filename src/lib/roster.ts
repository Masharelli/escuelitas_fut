import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";

/** Rechaza la lista completa antes de escribir si contiene alumnos ajenos. */
export async function assertStudentRoster(
  schoolId: string,
  teamId: string,
  studentIds: string[],
  executor: Pick<typeof db, "query"> = db
) {
  if (!studentIds.length) return;
  const roster = await executor.query.students.findMany({
    where: and(eq(students.schoolId, schoolId), eq(students.teamId, teamId), inArray(students.id, studentIds)),
    columns: { id: true },
  });
  if (roster.length !== studentIds.length) throw new Error("La lista contiene alumnos inválidos para este equipo");
}
