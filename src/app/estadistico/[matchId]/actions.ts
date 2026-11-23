"use server";

import { recordActivity } from "@/lib/activity";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/tenant";
import {
  addMatchEvent,
  getMatchEvents,
  getMatchForScorekeeper,
  liveScore,
  deleteMatchEvent,
  finalizeMatch,
  PHASE_EVENTS,
  type MatchEventType,
} from "@/lib/match-events";
import { guardiansOfTeam, notifyUsers } from "@/lib/notifications";

/** Carga el partido capturable o redirige si no hay permiso. */
async function requireScorekeeper(matchId: string, userId: string) {
  const match = await getMatchForScorekeeper(matchId, userId);
  if (!match) redirect("/");
  return match;
}

const EVENT_TYPES: MatchEventType[] = [
  "goal",
  "goal_opponent",
  "yellow",
  "red",
  ...PHASE_EVENTS,
];

const PHASE_TITLES: Record<string, string> = {
  kick_off: "🟢 ¡Arranca el partido!",
  half_time: "⏸️ Medio tiempo",
  second_half: "▶️ Arranca el segundo tiempo",
  full_time: "🏁 Final del partido",
};

export async function addEventAction(formData: FormData) {
  const session = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  const type = String(formData.get("type") ?? "");
  if (!matchId || !(EVENT_TYPES as string[]).includes(type)) {
    redirect("/");
  }
  const match = await requireScorekeeper(matchId, session.user.id);
  const operator = await db.query.memberships.findFirst({ where: and(eq(memberships.schoolId, match.schoolId), eq(memberships.userId, session.user.id)), columns: { role: true } });
  return recordActivity({ schoolId: match.schoolId, userId: session.user.id, role: operator?.role ?? "parent" }, session.user.name, "Capturar evento de partido", formData, async () => {

  const isPhase = (PHASE_EVENTS as string[]).includes(type);
  const minuteRaw = Number(formData.get("minute"));
  const minute =
    !isPhase && Number.isFinite(minuteRaw) && minuteRaw > 0
      ? Math.floor(minuteRaw)
      : null;
  const studentId = String(formData.get("studentId") ?? "").trim() || null;

  await addMatchEvent({
    schoolId: match.schoolId,
    matchId,
    type: type as MatchEventType,
    minute,
    studentId: isPhase || type === "goal_opponent" ? null : studentId,
  });

  // El final del partido cierra todo: marcador, estadísticas y tabla del torneo.
  if (type === "full_time") {
    await finalizeMatch(match);
  }

  // Marcador parcial tras este evento y aviso a los tutores del equipo.
  const events = await getMatchEvents(match.schoolId, matchId);
  const { ours, opp } = liveScore(events);
  const scoreline = match.isHome
    ? `${match.team.name} ${ours}-${opp} ${match.opponentName}`
    : `${match.opponentName} ${opp}-${ours} ${match.team.name}`;

  let scorerName: string | null = null;
  if (!isPhase && studentId && type !== "goal_opponent") {
    const last = events.find((e) => e.studentId === studentId && e.type === type);
    if (last?.student) {
      scorerName = `${last.student.firstName} ${last.student.lastName}`;
    }
  }

  const min = minute ? ` · min ${minute}` : "";
  let title = "";
  if (isPhase) {
    title = PHASE_TITLES[type];
  } else if (type === "goal") {
    title = `⚽ Gol de ${match.team.name}${min}`;
  } else if (type === "goal_opponent") {
    title = `Gol del rival${min}`;
  } else if (type === "yellow") {
    title = `🟨 Amarilla${min}`;
  } else {
    title = `🟥 Roja${min}`;
  }

  const recipients = await guardiansOfTeam(match.teamId);
  if (recipients.length > 0) {
    await notifyUsers(recipients, {
      schoolId: match.schoolId,
      type: "match_result",
      title,
      body: `${scorerName ? `${scorerName} · ` : ""}Marcador: ${scoreline}`,
      link: "/padres/partidos",
    });
  }

  revalidatePath(`/estadistico/${matchId}`);
  });
}

export async function deleteEventAction(formData: FormData) {
  const session = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!matchId) redirect("/");
  const match = await requireScorekeeper(matchId, session.user.id);
  const operator = await db.query.memberships.findFirst({ where: and(eq(memberships.schoolId, match.schoolId), eq(memberships.userId, session.user.id)), columns: { role: true } });
  return recordActivity({ schoolId: match.schoolId, userId: session.user.id, role: operator?.role ?? "parent" }, session.user.name, "Eliminar evento de partido", formData, async () => {
  if (eventId) await deleteMatchEvent(eventId, match.schoolId, matchId);
  revalidatePath(`/estadistico/${matchId}`);
  });
}
