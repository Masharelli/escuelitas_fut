"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { charges, guardianships, schools } from "@/db/schema";
import { requireAuth } from "@/lib/tenant";
import { getStripe } from "@/lib/stripe";

/**
 * Inicia el pago en línea de un cargo: crea una Checkout Session EN LA CUENTA
 * de la escuela (cobro directo) y manda al papá a la página de pago de Stripe.
 * Valida que el cargo sea de un hijo del usuario y esté pendiente.
 */
export async function payCharge(formData: FormData) {
  const chargeId = String(formData.get("chargeId") ?? "");
  if (!chargeId) redirect("/padres/pagos");

  const session = await requireAuth();
  const userId = session.user.id;

  const charge = await db.query.charges.findFirst({
    where: eq(charges.id, chargeId),
  });
  if (!charge || charge.status !== "pending") redirect("/padres/pagos");

  // El cargo debe ser de un hijo del usuario.
  const link = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, charge.studentId)
    ),
  });
  if (!link) redirect("/padres/pagos");

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, charge.schoolId),
  });
  if (!school?.stripeAccountId || !school.stripeChargesEnabled) {
    // La escuela aún no tiene pagos en línea activos.
    redirect("/padres/pagos?nopay=1");
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const stripe = getStripe();

  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: charge.currency.toLowerCase(),
            product_data: { name: charge.description },
            unit_amount: charge.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { chargeId: charge.id },
      payment_intent_data: { metadata: { chargeId: charge.id } },
      success_url: `${origin}/padres/pagos?confirm={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/padres/pagos`,
    },
    { stripeAccount: school.stripeAccountId }
  );

  await db
    .update(charges)
    .set({ stripeCheckoutId: checkout.id })
    .where(eq(charges.id, charge.id));

  if (!checkout.url) redirect("/padres/pagos");
  redirect(checkout.url);
}
