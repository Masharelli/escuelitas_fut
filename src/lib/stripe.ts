import Stripe from "stripe";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, charges, guardianships, autopay } from "@/db/schema";
import { notifyChargePaidById } from "@/lib/billing";

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
    await notifyChargePaidById(charge.id);
    return true;
  }
  return false;
}

/**
 * Confirma el alta de pago automático al volver del Checkout (modo "setup"):
 * obtiene la tarjeta guardada, la deja como predeterminada del cliente y activa
 * el autopago del alumno. Verifica que el alumno sea hijo del usuario.
 */
export async function confirmAutopaySetup(
  userId: string,
  studentId: string,
  sessionId: string
): Promise<boolean> {
  const link = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, studentId)
    ),
  });
  if (!link) return false;

  const row = await db.query.autopay.findFirst({
    where: eq(autopay.studentId, studentId),
  });
  if (!row) return false;

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, row.schoolId),
  });
  if (!school?.stripeAccountId) return false;
  const acct = { stripeAccount: school.stripeAccountId };
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    undefined,
    acct
  );
  const setupIntentId =
    typeof session.setup_intent === "string" ? session.setup_intent : null;
  if (!setupIntentId) return false;

  const setup = await stripe.setupIntents.retrieve(setupIntentId, undefined, acct);
  const pm =
    typeof setup.payment_method === "string" ? setup.payment_method : null;
  if (!pm) return false;

  // Deja la tarjeta como predeterminada del cliente (para cobros off-session).
  await stripe.customers.update(
    row.stripeCustomerId,
    { invoice_settings: { default_payment_method: pm } },
    acct
  );

  await db
    .update(autopay)
    .set({ stripePaymentMethodId: pm, status: "active" })
    .where(eq(autopay.id, row.id));

  return true;
}

/**
 * Cobra off-session las cuotas mensuales PENDIENTES de un periodo a los alumnos
 * con autopago activo. Si la tarjeta es rechazada o requiere autenticación, el
 * cargo se queda pendiente (el papá puede pagarlo manualmente). Devuelve cuántos
 * se cobraron.
 */
export async function chargeAutopayForPeriod(
  schoolId: string,
  period: string
): Promise<number> {
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, schoolId),
  });
  if (!school?.stripeAccountId || !school.stripeChargesEnabled) return 0;
  const acct = { stripeAccount: school.stripeAccountId };
  const stripe = getStripe();

  const rows = await db
    .select({
      chargeId: charges.id,
      amount: charges.amountCents,
      currency: charges.currency,
      customer: autopay.stripeCustomerId,
      pm: autopay.stripePaymentMethodId,
    })
    .from(charges)
    .innerJoin(autopay, eq(autopay.studentId, charges.studentId))
    .where(
      and(
        eq(charges.schoolId, schoolId),
        eq(charges.kind, "monthly"),
        eq(charges.periodMonth, period),
        eq(charges.status, "pending"),
        eq(autopay.status, "active")
      )
    );

  let charged = 0;
  for (const r of rows) {
    if (!r.pm) continue;
    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: r.amount,
          currency: r.currency.toLowerCase(),
          customer: r.customer,
          payment_method: r.pm,
          off_session: true,
          confirm: true,
          metadata: { chargeId: r.chargeId },
        },
        acct
      );
      if (pi.status === "succeeded") {
        await db
          .update(charges)
          .set({ status: "paid", paidAt: new Date(), stripePaymentIntentId: pi.id })
          .where(eq(charges.id, r.chargeId));
        await notifyChargePaidById(r.chargeId);
        charged += 1;
      }
    } catch {
      // Tarjeta rechazada / requiere autenticación: se queda pendiente.
    }
  }
  return charged;
}
