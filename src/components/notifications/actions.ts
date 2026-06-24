"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/tenant";
import { markAllNotificationsRead } from "@/lib/notifications";

/** Marca como leídos todos los avisos del usuario actual y refresca la campana. */
export async function markMyNotificationsRead() {
  const session = await requireAuth();
  await markAllNotificationsRead(session.user.id);
  // Refresca el contador de la campana en ambos portales.
  revalidatePath("/admin", "layout");
  revalidatePath("/padres", "layout");
}
