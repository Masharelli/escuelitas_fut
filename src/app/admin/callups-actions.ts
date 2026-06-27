"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireRole, STAFF_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { assertTeamAccess } from "@/lib/coach";
import { matches, trainingSessions } from "@/db/schema";
import { setCallups } from "@/lib/callups";
import { notifyStudentGuardians } from "@/lib/notifications";
import { formatKickoff } from "@/lib/competition";

export type FormState = { error?: string; ok?: boolean } | undefined;

/**
 * Ajusta la convocatoria de un partido o sesión a los alumnos seleccionados y
 * avisa a los tutores de los recién convocados. `target` = "match" | "session".
 */
export async function saveCallups(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(STAFF_ROLES);
  const target = String(formData.get("target") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if ((target !== "match" && target !== "session") || !targetId) {
    return { error: "Evento inválido" };
  }

  const studentIds = formData
    .getAll("studentIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const tdb = tenantDb(membership.schoolId);

  // Verifica que el evento pertenezca a la escuela y arma el aviso.
  let title: string;
  let when: Date;
  let link: string;
  let notifyType: "match_upcoming" | "session_upcoming";

  if (target === "match") {
    const match = await tdb.matches.findFirst({
      where: eq(matches.id, targetId),
      with: { team: true },
    });
    if (!match) return { error: "Partido no encontrado" };
    await assertTeamAccess(membership, match.teamId);
    title = `${match.team.name} ${match.isHome ? "vs" : "@"} ${match.opponentName}`;
    when = match.kickoffAt;
    link = "/padres/partidos";
    notifyType = "match_upcoming";
  } else {
    const session = await tdb.sessions.findFirst({
      where: eq(trainingSessions.id, targetId),
      with: { team: true },
    });
    if (!session) return { error: "Sesión no encontrada" };
    await assertTeamAccess(membership, session.teamId);
    title = `${session.title} · ${session.team.name}`;
    when = session.startsAt;
    link = "/padres/entrenamientos";
    notifyType = "session_upcoming";
  }

  const { addedStudentIds } = await setCallups(
    {
      schoolId: membership.schoolId,
      matchId: target === "match" ? targetId : undefined,
      sessionId: target === "session" ? targetId : undefined,
    },
    studentIds
  );

  await Promise.all(
    addedStudentIds.map((studentId) =>
      notifyStudentGuardians(studentId, {
        schoolId: membership.schoolId,
        type: notifyType,
        title: `Convocatoria: ${title}`,
        body: `Tu hijo(a) fue convocado(a). ${formatKickoff(when)}. Confirma su asistencia.`,
        link,
      })
    )
  );

  if (target === "match") {
    revalidatePath(`/admin/partidos/${targetId}`);
    revalidatePath(`/coach/partidos/${targetId}`);
  } else {
    revalidatePath(`/admin/asistencias/${targetId}`);
    revalidatePath(`/coach/sesiones/${targetId}`);
  }
  return { ok: true };
}
