import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { schools, seasonTeams, leagueCharges } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";
import { getStripe } from "@/lib/stripe";

/**
 * Cobros de INSCRIPCIÓN de liga (Fase L4). Reusa la cuenta de Stripe Connect de
 * la organización (la liga cobra a su propia cuenta, igual que la academia). El
 * pagador (responsable del equipo) NO necesita cuenta: paga por un enlace
 * público /pagar/[id]; la confirmación al volver marca el cargo (el webhook solo
 * hace falta para robustez ante pestañas cerradas).
 */

/**
 * Crea un cargo de inscripción PENDIENTE por cada equipo inscrito que aún no lo
 * tenga, con el monto de la temporada. Idempotente. Devuelve cuántos creó.
 */
export async function generateRegistrationCharges(
  schoolId: string,
  seasonId: string
): Promise<number> {
  const tdb = tenantDb(schoolId);
  const season = await tdb.seasons.findById(seasonId);
  if (!season?.registrationFeeCents || season.registrationFeeCents <= 0) return 0;

  const registered = await tdb.seasonTeams.findMany({
    where: eq(seasonTeams.seasonId, seasonId),
    columns: { teamId: true },
  });
  if (registered.length === 0) return 0;

  const created = await tdb.leagueCharges.insertManyIgnoringDuplicates(
    registered.map((r) => ({
      seasonId,
      teamId: r.teamId,
      description: `Inscripción · ${season.name}`,
      amountCents: season.registrationFeeCents as number,
    }))
  );
  return created.length;
}

/**
 * Crea una sesión de Checkout (pago) en la cuenta conectada de la liga para un
 * cargo de inscripción y devuelve la URL. Null si el cargo no aplica o la liga
 * no tiene cobros en línea activos.
 */
export async function createRegistrationCheckout(
  chargeId: string,
  origin: string
): Promise<string | null> {
  const charge = await db.query.leagueCharges.findFirst({
    where: eq(leagueCharges.id, chargeId),
  });
  if (!charge || charge.status === "paid") return null;

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, charge.schoolId),
  });
  if (!school?.stripeAccountId || !school.stripeChargesEnabled) return null;

  const session = await getStripe().checkout.sessions.create(
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
      success_url: `${origin}/pagar/${charge.id}?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pagar/${charge.id}`,
      metadata: { leagueChargeId: charge.id },
    },
    { stripeAccount: school.stripeAccountId }
  );

  await db
    .update(leagueCharges)
    .set({ stripeCheckoutId: session.id })
    .where(eq(leagueCharges.id, charge.id));

  return session.url;
}

/**
 * Confirma el pago al volver del Checkout (sin webhook): solo acepta la sesión
 * que creamos para ESE cargo (anti-suplantación). Marca pagado si Stripe lo
 * reporta pagado. Devuelve true si quedó pagado.
 */
export async function confirmRegistrationCheckout(
  chargeId: string,
  sessionId: string
): Promise<boolean> {
  const charge = await db.query.leagueCharges.findFirst({
    where: eq(leagueCharges.id, chargeId),
  });
  if (!charge) return false;
  if (charge.status === "paid") return true;
  if (!charge.stripeCheckoutId || charge.stripeCheckoutId !== sessionId) {
    return false;
  }

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
      .update(leagueCharges)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      })
      .where(eq(leagueCharges.id, charge.id));
    return true;
  }
  return false;
}

/** Resumen de inscripciones de una temporada: cobrado y pendiente (centavos). */
export async function registrationSummary(schoolId: string, seasonId: string) {
  const charges = await db.query.leagueCharges.findMany({
    where: and(
      eq(leagueCharges.schoolId, schoolId),
      eq(leagueCharges.seasonId, seasonId)
    ),
  });
  let paidCents = 0;
  let pendingCents = 0;
  for (const c of charges) {
    if (c.status === "paid") paidCents += c.amountCents;
    else if (c.status === "pending") pendingCents += c.amountCents;
  }
  return { paidCents, pendingCents, count: charges.length };
}
