"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createRegistrationCheckout } from "@/lib/league-billing";

/** Crea la sesión de Checkout para la inscripción y manda a Stripe. */
export async function payRegistration(formData: FormData) {
  const chargeId = String(formData.get("chargeId") ?? "");
  if (!chargeId) return;
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const url = await createRegistrationCheckout(chargeId, origin);
  if (url) redirect(url);
}
