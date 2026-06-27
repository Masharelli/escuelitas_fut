"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/tenant";
import { respondToCallup } from "@/lib/callups";

/**
 * Respuesta del tutor a una convocatoria (asistirá / no). `respondToCallup`
 * verifica que la convocatoria sea de un hijo del usuario antes de escribir.
 */
export async function respondCallup(formData: FormData) {
  const session = await requireAuth();
  const callupId = String(formData.get("callupId") ?? "");
  const rsvp = String(formData.get("rsvp") ?? "");
  if (callupId && (rsvp === "yes" || rsvp === "no")) {
    await respondToCallup(session.user.id, callupId, rsvp);
  }
  revalidatePath("/padres/partidos");
  revalidatePath("/padres/entrenamientos");
}
