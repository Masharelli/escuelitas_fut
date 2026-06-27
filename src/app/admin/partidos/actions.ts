"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, STAFF_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { assertTeamAccess } from "@/lib/coach";
import { guardiansOfTeam, notifyUsers } from "@/lib/notifications";

export type FormState = { error?: string; ok?: boolean } | undefined;

const createSchema = z.object({
  teamId: z.string().min(1, "Elige un equipo"),
  opponentName: z.string().min(1, "Escribe el rival"),
  kickoff: z.string().min(1, "Elige fecha y hora"),
  isHome: z.string().nullish(), // "home" | "away"
  location: z.string().nullish(),
  mapUrl: z.string().nullish(),
  requiredUniform: z.string().nullish(),
  tournamentId: z.string().nullish(),
});

export async function createMatch(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(STAFF_ROLES);
  const parsed = createSchema.safeParse({
    teamId: formData.get("teamId"),
    opponentName: formData.get("opponentName"),
    kickoff: formData.get("kickoff"),
    isHome: formData.get("isHome"),
    location: formData.get("location"),
    mapUrl: formData.get("mapUrl"),
    requiredUniform: formData.get("requiredUniform"),
    tournamentId: formData.get("tournamentId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const kickoffAt = new Date(parsed.data.kickoff);
  if (Number.isNaN(kickoffAt.getTime())) {
    return { error: "Fecha y hora inválidas" };
  }

  const tdb = tenantDb(membership.schoolId);

  const team = await tdb.teams.findById(parsed.data.teamId);
  if (!team) return { error: "Equipo inválido" };
  await assertTeamAccess(membership, team.id);

  let tournamentId: string | null = null;
  if (parsed.data.tournamentId) {
    const t = await tdb.tournaments.findById(parsed.data.tournamentId);
    if (t) tournamentId = t.id;
  }

  await tdb.matches.insert({
    teamId: team.id,
    opponentName: parsed.data.opponentName.trim(),
    kickoffAt,
    isHome: parsed.data.isHome !== "away",
    location: parsed.data.location?.trim() || null,
    mapUrl: parsed.data.mapUrl?.trim() || null,
    requiredUniform: parsed.data.requiredUniform?.trim() || null,
    tournamentId,
  });

  revalidatePath("/admin/partidos");
  revalidatePath(`/coach/equipos/${team.id}`);
  redirect(
    membership.role === "coach"
      ? `/coach/equipos/${team.id}`
      : "/admin/partidos"
  );
}

/**
 * Guarda el marcador de un partido y las estadísticas por jugador. Marca el
 * partido como jugado. Las stats vienen como campos goals_<id> / assists_<id>;
 * la lista de alumnos viaja en `studentIds` (separados por coma).
 */
export async function saveResult(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(STAFF_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  const ourScore = Number(formData.get("ourScore"));
  const opponentScore = Number(formData.get("opponentScore"));

  if (!matchId) return { error: "Partido no encontrado" };
  if (
    !Number.isInteger(ourScore) ||
    !Number.isInteger(opponentScore) ||
    ourScore < 0 ||
    opponentScore < 0
  ) {
    return { error: "Marcador inválido" };
  }

  const tdb = tenantDb(membership.schoolId);
  const match = await tdb.matches.findById(matchId);
  if (!match) return { error: "Partido no encontrado" };
  await assertTeamAccess(membership, match.teamId);

  await tdb.matches.updateById(matchId, {
    ourScore,
    opponentScore,
    status: "played",
  });

  // Estadísticas por jugador (solo guarda filas con goles o asistencias).
  const ids = String(formData.get("studentIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rows = ids
    .map((studentId) => ({
      studentId,
      goals: Math.max(0, Number(formData.get(`goals_${studentId}`)) || 0),
      assists: Math.max(0, Number(formData.get(`assists_${studentId}`)) || 0),
      yellowCards: Math.max(0, Number(formData.get(`yellow_${studentId}`)) || 0),
      redCards: Math.max(0, Number(formData.get(`red_${studentId}`)) || 0),
      minutesPlayed: Math.max(0, Number(formData.get(`min_${studentId}`)) || 0),
    }))
    .filter(
      (r) =>
        r.goals > 0 ||
        r.assists > 0 ||
        r.yellowCards > 0 ||
        r.redCards > 0 ||
        r.minutesPlayed > 0
    );

  await tdb.matchPlayerStats.replaceForMatch(matchId, rows);

  // Avisa a los tutores del equipo que ya hay resultado.
  const team = await tdb.teams.findById(match.teamId);
  const recipients = await guardiansOfTeam(match.teamId);
  if (team && recipients.length > 0) {
    const outcome =
      ourScore > opponentScore
        ? "Victoria"
        : ourScore < opponentScore
          ? "Derrota"
          : "Empate";
    const scoreline = match.isHome
      ? `${team.name} ${ourScore}-${opponentScore} ${match.opponentName}`
      : `${match.opponentName} ${opponentScore}-${ourScore} ${team.name}`;
    await notifyUsers(recipients, {
      schoolId: membership.schoolId,
      type: "match_result",
      title: `${outcome}: ${scoreline}`,
      body: `Ya está disponible el resultado del partido de ${team.name}.`,
      link: "/padres/partidos",
    });
  }

  revalidatePath(`/admin/partidos/${matchId}`);
  revalidatePath(`/coach/partidos/${matchId}`);
  revalidatePath("/admin/partidos");
  return { ok: true };
}

export async function setMatchStatus(formData: FormData) {
  const { membership } = await requireRole(STAFF_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["scheduled", "canceled", "postponed"] as const;
  if (matchId && (allowed as readonly string[]).includes(status)) {
    const tdb = tenantDb(membership.schoolId);
    const match = await tdb.matches.findById(matchId);
    if (!match) return;
    await assertTeamAccess(membership, match.teamId);
    await tdb.matches.updateById(matchId, {
      status: status as (typeof allowed)[number],
    });
    revalidatePath(`/admin/partidos/${matchId}`);
    revalidatePath("/admin/partidos");
  }
}

export async function deleteMatch(formData: FormData) {
  const { membership } = await requireRole(STAFF_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) redirect("/admin/partidos");

  const tdb = tenantDb(membership.schoolId);
  const match = await tdb.matches.findById(matchId);
  if (!match) redirect("/admin/partidos");
  await assertTeamAccess(membership, match.teamId);

  await tdb.matches.deleteById(matchId);

  revalidatePath("/admin/partidos");
  revalidatePath(`/coach/equipos/${match.teamId}`);
  redirect(
    membership.role === "coach"
      ? `/coach/equipos/${match.teamId}`
      : "/admin/partidos"
  );
}

/**
 * Designa (o quita) al "papá estadístico" de un partido: un tutor que capturará
 * el partido en vivo. `scorekeeperUserId` vacío lo quita.
 */
export async function designateScorekeeper(formData: FormData) {
  const { membership } = await requireRole(STAFF_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  const userId = String(formData.get("scorekeeperUserId") ?? "").trim();
  if (!matchId) redirect("/admin/partidos");

  const tdb = tenantDb(membership.schoolId);
  const match = await tdb.matches.findById(matchId);
  if (!match) redirect("/admin/partidos");
  await assertTeamAccess(membership, match.teamId);

  await tdb.matches.updateById(matchId, {
    scorekeeperUserId: userId || null,
  });

  revalidatePath(`/admin/partidos/${matchId}`);
  revalidatePath(`/coach/partidos/${matchId}`);
}
