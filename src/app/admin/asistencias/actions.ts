"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, STAFF_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { assertTeamAccess } from "@/lib/coach";
import { formatKickoff } from "@/lib/competition";
import {
  guardiansOfTeam,
  notifyStudentGuardians,
  notifyUsers,
} from "@/lib/notifications";
import {
  ATTENDANCE_STATUS_LABELS,
  SESSION_KIND_LABELS,
  type AttendanceStatus,
} from "@/lib/attendance";

export type FormState = { error?: string; ok?: boolean } | undefined;

const ATTENDANCE_VALUES = Object.keys(
  ATTENDANCE_STATUS_LABELS
) as AttendanceStatus[];

const createSchema = z.object({
  teamId: z.string().min(1, "Elige un equipo"),
  kind: z.enum(["training", "event"]).default("training"),
  title: z.string().nullish(),
  startsAt: z.string().min(1, "Elige fecha y hora"),
  location: z.string().nullish(),
});

export async function createSession(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(STAFF_ROLES);
  const parsed = createSchema.safeParse({
    teamId: formData.get("teamId"),
    kind: formData.get("kind") ?? "training",
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    location: formData.get("location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Fecha y hora inválidas" };
  }

  const tdb = tenantDb(membership.schoolId);
  const team = await tdb.teams.findById(parsed.data.teamId);
  if (!team) return { error: "Equipo inválido" };
  await assertTeamAccess(membership, team.id);

  const title =
    parsed.data.title?.trim() || SESSION_KIND_LABELS[parsed.data.kind];

  await tdb.sessions.insert({
    teamId: team.id,
    kind: parsed.data.kind,
    title,
    startsAt,
    location: parsed.data.location?.trim() || null,
  });

  // Avisa a los tutores del equipo que se programó la sesión.
  const recipients = await guardiansOfTeam(team.id);
  if (recipients.length > 0) {
    await notifyUsers(recipients, {
      schoolId: membership.schoolId,
      type: "session_upcoming",
      title: `Nuevo ${SESSION_KIND_LABELS[parsed.data.kind].toLowerCase()}: ${title}`,
      body: `${team.name} · ${formatKickoff(startsAt)}${
        parsed.data.location?.trim() ? ` · ${parsed.data.location.trim()}` : ""
      }`,
      link: "/padres/entrenamientos",
    });
  }

  revalidatePath("/admin/asistencias");
  revalidatePath(`/coach/equipos/${team.id}`);
  redirect(
    membership.role === "coach"
      ? `/coach/equipos/${team.id}`
      : "/admin/asistencias"
  );
}

/**
 * Guarda el pase de lista de una sesión. La lista de alumnos viaja en
 * `studentIds` (separados por coma); el estado de cada uno en `status_<id>`
 * (por defecto "present"). Avisa a los tutores de los alumnos ausentes.
 */
export async function saveAttendance(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(STAFF_ROLES);
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Sesión no encontrada" };

  const tdb = tenantDb(membership.schoolId);
  const session = await tdb.sessions.findById(sessionId);
  if (!session) return { error: "Sesión no encontrada" };
  await assertTeamAccess(membership, session.teamId);

  const ids = String(formData.get("studentIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rows = ids.map((studentId) => {
    const raw = String(formData.get(`status_${studentId}`) ?? "present");
    const status: AttendanceStatus = (
      ATTENDANCE_VALUES as string[]
    ).includes(raw)
      ? (raw as AttendanceStatus)
      : "present";
    const note = String(formData.get(`note_${studentId}`) ?? "").trim();
    return { studentId, status, note: note || null };
  });

  await tdb.attendance.replaceForSession(sessionId, rows);

  // Avisa a los tutores de los alumnos ausentes (sin justificar).
  const absent = rows.filter((r) => r.status === "absent");
  const team = await tdb.teams.findById(session.teamId);
  await Promise.all(
    absent.map((r) =>
      notifyStudentGuardians(r.studentId, {
        schoolId: membership.schoolId,
        type: "general",
        title: "Falta registrada",
        body: `Tu hijo(a) no asistió a "${session.title}"${
          team ? ` (${team.name})` : ""
        }.`,
        link: "/padres",
      })
    )
  );

  revalidatePath(`/admin/asistencias/${sessionId}`);
  revalidatePath(`/coach/sesiones/${sessionId}`);
  revalidatePath("/admin/asistencias");
  return { ok: true };
}

export async function deleteSession(formData: FormData) {
  const { membership } = await requireRole(STAFF_ROLES);
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) redirect("/admin/asistencias");

  const tdb = tenantDb(membership.schoolId);
  const session = await tdb.sessions.findById(sessionId);
  if (!session) redirect("/admin/asistencias");
  await assertTeamAccess(membership, session.teamId);

  await tdb.sessions.deleteById(sessionId);

  revalidatePath("/admin/asistencias");
  revalidatePath(`/coach/equipos/${session.teamId}`);
  redirect(
    membership.role === "coach"
      ? `/coach/equipos/${session.teamId}`
      : "/admin/asistencias"
  );
}
