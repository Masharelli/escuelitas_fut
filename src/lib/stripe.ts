import Stripe from "stripe";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, charges, guardianships } from "@/db/schema";

let client: Stripe | null = null;

/** Cliente de Stripe (lazy). Lanza error claro si falta la clave. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Falta STRIPE_SECRET_KEY en .env.local. Pégala desde el dashboard de Stripe (modo prueba)."
    );
  }
  if (!client) client = new Stripe(key);
  return client;
}

/**
 * Consulta el estado de la cuenta conectada de la escuela y lo guarda en la DB
 * (`stripeChargesEnabled` / `stripeDetailsSubmitted`). Útil al volver del
 * onboarding sin depender del webhook. Devuelve si ya puede cobrar.
 */
export async function refreshConnectStatus(
  schoolId: string,
  stripeAccountId: string
): Promise<{ chargesEnabled: boolean; detailsSubmitted: boolean }> {
  const account = await getStripe().accounts.retrieve(stripeAccountId);
  const chargesEnabled = !!account.charges_enabled;
  const detailsSubmitted = !!account.details_submitted;

  await db
    .update(schools)
    .set({
      stripeChargesEnabled: chargesEnabled,
      stripeDetailsSubmitted: detailsSubmitted,
    })
    .where(eq(schools.id, schoolId));

  return { chargesEnabled, detailsSubmitted };
}

/**
 * Confirma un pago al volver del Checkout (sin depender del webhook): localiza
 * el cargo por su `stripeCheckoutId`, verifica que sea de un hijo del usuario,
 * consulta la sesión en la cuenta de la escuela y, si está pagada, marca el
 * cargo como pagado. Devuelve true si quedó pagado.
 */
export async function confirmCheckoutForUser(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const charge = await db.query.charges.findFirst({
    where: eq(charges.stripeCheckoutId, sessionId),
  });
  if (!charge) return false;

  const link = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, charge.studentId)
    ),
  });
  if (!link) return false;
  if (charge.status === "paid") return true;

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, charge.schoolId),
  });
  if (!school?.stripeAccountId) return false;

  const session = await getStripe().checkout.sessions.retrieve(
    sessionId,
    undefined,
    { stripeAccount: school.stripeAccountId }
  );
  if (session.payment_status === "paid") {
    await db
      .update(charges)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      })
      .where(eq(charges.id, charge.id));
    return true;
  }
  return false;
}
