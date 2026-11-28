import { eq } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";
import { db } from "@/db";
import { activityLog } from "@/db/schema";

/** Registra cada operación autorizada antes de ejecutarla; sin historial, no escribe. */
export async function recordActivity<T>(
  actor: { schoolId: string; userId: string; role: string },
  actorName: string | null | undefined,
  action: string,
  formData: FormData,
  work: () => Promise<T>
): Promise<T> {
  // Solo campos operativos: excluye secretos, archivos y fichas de alumnos.
  const fields = ["id", "studentId", "studentIds", "teamId", "matchId", "sessionId", "eventId", "seasonId", "planId", "categoryId", "discountId", "invitationId", "target", "targetId", "name", "description", "amount", "kind", "value", "period", "generationDay", "dueDay", "fee", "spentOn", "status", "ourScore", "opponentScore", "homeScore", "awayScore", "type", "minute", "recipientId", "title", "body"];
  // ponytail: metadatos limitados a 1000 caracteres (avisos a 2000); ampliar si se necesitan textos operativos mayores.
  const details = Object.fromEntries(fields.filter((key) => formData.has(key)).map((key) => [key, formData.getAll(key).filter((v): v is string => typeof v === "string").map((v) => v.slice(0, key === "body" ? 2000 : 1000))]));
  const [entry] = await db.insert(activityLog).values({ schoolId: actor.schoolId, actorId: actor.userId, actorName: actorName ?? null, actorRole: actor.role, action, details }).returning({ id: activityLog.id });
  try {
    const result = await work();
    await db.update(activityLog).set({ status: result && typeof result === "object" && "error" in result && result.error ? "rejected" : "completed" }).where(eq(activityLog.id, entry.id));
    return result;
  } catch (error) {
    await db.update(activityLog).set({ status: isRedirectError(error) ? "completed" : "failed" }).where(eq(activityLog.id, entry.id));
    throw error;
  }
}
