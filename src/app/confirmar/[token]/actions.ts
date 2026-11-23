"use server";

import { revalidatePath } from "next/cache";

import { respondByToken } from "@/lib/callups";

/** Respuesta Sí/No de la convocatoria vía link mágico (sin login). */
export async function respondAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const rsvp = String(formData.get("rsvp") ?? "");
  if (rsvp === "yes" || rsvp === "no") {
    await respondByToken(token, rsvp);
  }
  revalidatePath(`/confirmar/${token}`);
}
