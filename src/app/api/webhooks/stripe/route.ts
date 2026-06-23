import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, charges } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

/**
 * Webhook de Stripe. En local, reenvía los eventos con el Stripe CLI:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
 *                 --forward-connect-to localhost:3000/api/webhooks/stripe
 * y pega el `whsec_…` que imprime en STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return new Response("Webhook no configurado", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("Firma inválida", { status: 400 });
  }

  switch (event.type) {
    // La cuenta conectada de una escuela cambió (terminó onboarding, etc.).
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await db
        .update(schools)
        .set({
          stripeChargesEnabled: !!account.charges_enabled,
          stripeDetailsSubmitted: !!account.details_submitted,
        })
        .where(eq(schools.stripeAccountId, account.id));
      break;
    }
    // Un papá completó el pago de un cargo.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const chargeId = session.metadata?.chargeId;
      if (chargeId && session.payment_status === "paid") {
        await db
          .update(charges)
          .set({
            status: "paid",
            paidAt: new Date(),
            stripeCheckoutId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
          })
          .where(eq(charges.id, chargeId));
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
