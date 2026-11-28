import Stripe from "stripe";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import { schools, charges, guardianships, autopay } from "@/db/schema";
import { notifyChargePaidById, recordStripeChargePayment } from "@/lib/billing";
import { billingDate, hasReachedBillingDay } from "@/lib/billing-rules";

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

/** Expira un enlace abierto para poder cambiar el saldo o registrar un pago en caja. */
export async function expireUnpaidCheckout(stripeAccountId: string | null | undefined, checkoutId: string) {
  if (!stripeAccountId) return false;
  const acct = { stripeAccount: stripeAccountId };
  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.retrieve(checkoutId, undefined, acct);
  if (checkout.status === "expired") return true;
  if (checkout.status !== "open") return false;
  const expired = await stripe.checkout.sessions.expire(checkoutId, undefined, acct);
  return expired.status === "expired";
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
  if (session.payment_status !== "paid" || session.amount_total === null || !session.currency
      || typeof session.payment_intent !== "string") return false;
  const recorded = await recordStripeChargePayment({
    chargeId: charge.id, stripeAccountId: school.stripeAccountId,
    amount: session.amount_total, currency: session.currency,
    checkoutId: session.id, paymentIntentId: session.payment_intent,
  });
  if (recorded) return true;
  const updated = await db.query.charges.findFirst({ where: eq(charges.id, charge.id) });
  return updated?.status === "paid" && updated.stripePaymentIntentId === session.payment_intent;
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
 * Intenta el autopago de cuotas pendientes del mes a partir de su vencimiento.
 * Las cuotas sin vencimiento se intentan desde el día de generación.
 */
export async function chargeAutopayForPeriod(
  schoolId: string,
  period: string,
  today = billingDate(),
): Promise<number> {
  if (period !== today.slice(0, 7)) return 0;
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, schoolId),
  });
  if (!school?.stripeAccountId || !school.stripeChargesEnabled) return 0;
  if (!hasReachedBillingDay(today, school.paymentGenerationDay)) return 0;
  const due = or(isNull(charges.dueDate), lte(charges.dueDate, today));

  const rows = await db
    .select({
      chargeId: charges.id,
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
        gt(charges.amountCents, 0),
        due,
        isNull(charges.stripeCheckoutId),
        isNull(charges.autopayAttemptedAt),
        eq(autopay.schoolId, schoolId),
        eq(autopay.status, "active")
      )
    );
  if (!rows.length) return 0;

  const acct = { stripeAccount: school.stripeAccountId };
  const stripe = getStripe();
  let charged = 0;
  for (const r of rows) {
    if (!r.pm) continue;
    const paid = await db.transaction(async (tx) => {
      const [charge] = await tx.select().from(charges)
        .where(and(eq(charges.id, r.chargeId), eq(charges.status, "pending"),
          due, isNull(charges.stripeCheckoutId), isNull(charges.autopayAttemptedAt)))
        .for("update");
      if (!charge || charge.amountCents <= 0 || !r.pm) return false;
      const setup = await tx.query.autopay.findFirst({
        where: and(eq(autopay.studentId, charge.studentId), eq(autopay.schoolId, schoolId), eq(autopay.status, "active")),
      });
      if (!setup?.stripePaymentMethodId) return false;

      let pi;
      try {
        pi = await stripe.paymentIntents.create({
          amount: charge.amountCents,
          currency: charge.currency.toLowerCase(),
          customer: setup.stripeCustomerId,
          payment_method: setup.stripePaymentMethodId,
          payment_method_types: ["card"],
          off_session: true,
          confirm: true,
          metadata: { chargeId: charge.id, academyAutopay: "1" },
        }, { ...acct, idempotencyKey: `academy-autopay-${charge.id}` });
      } catch (error) {
        // Una tarjeta rechazada queda pendiente para que el tutor pueda pagarla.
        if (!(error instanceof Stripe.errors.StripeCardError)) throw error;
      }

      await tx.update(charges).set({
        autopayAttemptedAt: new Date(),
        ...(pi?.status === "succeeded" ? {
          status: "paid" as const, paidAt: new Date(), stripePaymentIntentId: pi.id,
        } : pi?.status === "processing" ? { stripePaymentIntentId: pi.id } : {}),
      }).where(eq(charges.id, charge.id));
      return pi?.status === "succeeded";
    });
    if (paid) {
      await notifyChargePaidById(r.chargeId);
      charged += 1;
    }
  }
  return charged;
}
