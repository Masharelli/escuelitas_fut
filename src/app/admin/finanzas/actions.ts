"use server";

import { revalidatePath } from "next/cache";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { notifyChargePaidById } from "@/lib/billing";
import { safeNext } from "@/lib/safe-next";

/** Revalida las vistas donde aparecen los cargos (incluye la de origen). */
function revalidateCharges(back: string) {
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/pagos");
  if (back !== "/admin/finanzas") revalidatePath(back);
}

/** Marca un cargo como pagado (p. ej. recibido en efectivo). */
export async function markChargePaid(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) {
    await tenantDb(membership.schoolId).charges.updateById(id, {
      status: "paid",
      paidAt: new Date(),
    });
    await notifyChargePaidById(id);
  }
  revalidateCharges(back);
}

/** Cancela un cargo. */
export async function cancelCharge(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) {
    await tenantDb(membership.schoolId).charges.updateById(id, {
      status: "canceled",
    });
  }
  revalidateCharges(back);
}

/** Regresa un cargo a pendiente (deshacer un pago/cancelación por error). */
export async function markChargePending(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const back = safeNext(formData.get("back"));
  if (id) {
    await tenantDb(membership.schoolId).charges.updateById(id, {
      status: "pending",
      paidAt: null,
    });
  }
  revalidateCharges(back);
}
