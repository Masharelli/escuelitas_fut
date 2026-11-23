"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, STAFF_ROLES } from "@/lib/tenant";
import { assertTeamAccess } from "@/lib/coach";
import { tenantDb } from "@/lib/tenant-db";
import { guardiansOfTeam } from "@/lib/notifications";
import { recordActivity } from "@/lib/activity";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NoticeState = { error?: string; ok?: boolean } | undefined;
const schema = z.object({ teamId: z.string().min(1), recipientId: z.string(), title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(2000) });

/** Aviso interno: solo tutores registrados del equipo autorizado. */
export async function sendTeamNotice(_prev: NoticeState, formData: FormData): Promise<NoticeState> {
  const { membership, session } = await requireRole(STAFF_ROLES);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escribe un título y un mensaje válidos." };
  const { teamId, recipientId, title, body } = parsed.data;
  const team = await tenantDb(membership.schoolId).teams.findById(teamId);
  if (!team) return { error: "Equipo inválido." };
  await assertTeamAccess(membership, team.id);
  const guardians = await guardiansOfTeam(team.id);
  const recipients = recipientId ? guardians.filter((g) => g.userId === recipientId) : guardians;
  if (!recipients.length) return { error: "No hay tutores registrados para ese destinatario." };
  return recordActivity(membership, session.user.name, "Enviar aviso a tutores", formData, async () => {
    await db.insert(notifications).values(recipients.map((r) => ({ schoolId: membership.schoolId, userId: r.userId, type: "general" as const, title, body: `${session.user.name ?? "Equipo de la escuela"} · ${team.name}\n\n${body}` })));
    revalidatePath("/padres/avisos");
    return { ok: true };
  });
}
