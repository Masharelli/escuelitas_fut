"use server";

import { recordActivity } from "@/lib/activity";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { charges } from "@/db/schema";
import { db } from "@/db";
import { cancelPendingCharge, markManualChargePaid, undoManualChargePayment } from "@/lib/billing";
import { safeNext } from "@/lib/safe-next";

/** Revalida las vistas donde aparecen los cargos (incluye la de origen). */
function revalidateCharges(back: string) {
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin/alumnos/[id]", "page");
  revalidatePath("/padres/pagos");
  if (back !== "/admin/finanzas") revalidatePath(back);
}

export async function undoManualPayment(formData: FormData) {
  const { membership, session } = await requireRole(ADMIN_ROLES);
  return recordActivity(membership, session.user.name, "Deshacer registro de pago", formData, async () => {
    const id = String(formData.get("id") ?? "");
    if (id) await undoManualChargePayment(membership.schoolId, id);
    revalidateCharges(safeNext(formData.get("back")));
    revalidatePath("/admin/finanzas/[studentId]", "page");
  });
}

/** Marca un cargo como pagado (p. ej. recibido en efectivo). */
export async function markChargePaid(formData: FormData) {
  const { membership, session } = await requireRole(ADMIN_ROLES);
  return recordActivity(membership, session.user.name, "Registrar pago de alumno", formData, async () => {
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) await markManualChargePaid(membership.schoolId, id);
  revalidateCharges(back);
  });
}

/** Cancela un cargo. */
export async function cancelCharge(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Cancelar cargo de alumno", formData, async () => {
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) await cancelPendingCharge(membership.schoolId, id);
  revalidateCharges(back);
  });
}

/** Regresa un cargo cancelado a pendiente. */
export async function markChargePending(formData: FormData) {
  const { membership, session } = await requireRole(["owner"]);
  return recordActivity(membership, session.user.name, "Reabrir cargo de alumno", formData, async () => {
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) {
    await db.update(charges).set({ status: "pending", paidAt: null })
      .where(and(eq(charges.id, id), eq(charges.schoolId, membership.schoolId), eq(charges.status, "canceled"),
        isNull(charges.stripeCheckoutId), isNull(charges.stripePaymentIntentId), isNull(charges.paidAt)));
  }
  revalidateCharges(back);
  });
}
