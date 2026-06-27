"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/tenant";
import {
  addMatchEvent,
  getMatchEvents,
  getMatchForScorekeeper,
  liveScore,
  deleteMatchEvent,
  type MatchEventType,
} from "@/lib/match-events";
import { guardiansOfTeam, notifyUsers } from "@/lib/notifications";

/** Carga el partido capturable o redirige si no hay permiso. */
async function requireScorekeeper(matchId: string, userId: string) {
  const match = await getMatchForScorekeeper(matchId, userId);
  if (!match) redirect("/");
  return match;
}

const EVENT_TYPES: MatchEventType[] = ["goal", "goal_opponent", "yellow", "red"];

export async function addEventAction(formData: FormData) {
  const session = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  const type = String(formData.get("type") ?? "");
  if (!matchId || !(EVENT_TYPES as string[]).includes(type)) {
    redirect("/");
  }
  const match = await requireScorekeeper(matchId, session.user.id);

  const minuteRaw = Number(formData.get("minute"));
  const minute =
    Number.isFinite(minuteRaw) && minuteRaw > 0 ? Math.floor(minuteRaw) : null;
  const studentId = String(formData.get("studentId") ?? "").trim() || null;

  await addMatchEvent({
    schoolId: match.schoolId,
    matchId,
    type: type as MatchEventType,
    minute,
    studentId: type === "goal_opponent" ? null : studentId,
  });

  // Marcador parcial tras este evento y aviso a los tutores del equipo.
  const events = await getMatchEvents(match.schoolId, matchId);
  const { ours, opp } = liveScore(events);
  const scoreline = match.isHome
    ? `${match.team.name} ${ours}-${opp} ${match.opponentName}`
    : `${match.opponentName} ${opp}-${ours} ${match.team.name}`;

  let scorerName: string | null = null;
  if (studentId && type !== "goal_opponent") {
    const last = events.find((e) => e.studentId === studentId && e.type === type);
    if (last?.student) {
      scorerName = `${last.student.firstName} ${last.student.lastName}`;
    }
  }

  const min = minute ? ` · min ${minute}` : "";
  let title = "";
  if (type === "goal") {
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
}

export async function deleteEventAction(formData: FormData) {
  const session = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!matchId) redirect("/");
  const match = await requireScorekeeper(matchId, session.user.id);
  if (eventId) await deleteMatchEvent(eventId, match.schoolId);
  revalidatePath(`/estadistico/${matchId}`);
}
