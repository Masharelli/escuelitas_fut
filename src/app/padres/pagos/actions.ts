"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { charges, guardianships, schools, students, autopay } from "@/db/schema";
import { requireAuth } from "@/lib/tenant";
import { getStripe } from "@/lib/stripe";
import { billingDate } from "@/lib/billing-rules";
import { generateMonthlyCharges } from "@/lib/recurring-billing";

/** Verifica que el alumno sea hijo del usuario; devuelve true/false. */
async function isGuardianOf(userId: string, studentId: string) {
  const link = await db.query.guardianships.findFirst({
    where: and(
      eq(guardianships.userId, userId),
      eq(guardianships.studentId, studentId)
    ),
  });
  return !!link;
}

/**
 * Activa el pago automático de un hijo: crea (o reutiliza) un Stripe Customer en
 * la cuenta de la escuela y manda al papá a Checkout (modo "setup") a guardar su
 * tarjeta. Al volver, /padres/pagos confirma y deja el autopago activo.
 */
export async function enableAutopay(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) redirect("/padres/pagos");

  const session = await requireAuth();
  const userId = session.user.id;
  if (!(await isGuardianOf(userId, studentId))) redirect("/padres/pagos");

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });
  if (!student) redirect("/padres/pagos");

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, student.schoolId),
  });
  if (!school?.stripeAccountId || !school.stripeChargesEnabled) {
    redirect("/padres/pagos?nopay=1");
  }

  const stripe = getStripe();
  const existing = await db.query.autopay.findFirst({
    where: eq(autopay.studentId, studentId),
  });

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
        metadata: { studentId, userId },
      },
      { stripeAccount: school.stripeAccountId }
    );
    customerId = customer.id;
  }

  if (existing) {
    await db
      .update(autopay)
      .set({ stripeCustomerId: customerId, userId, status: "pending" })
      .where(eq(autopay.id, existing.id));
  } else {
    await db.insert(autopay).values({
      schoolId: student.schoolId,
      studentId,
      userId,
      stripeCustomerId: customerId,
      status: "pending",
    });
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "setup",
      currency: "mxn",
      customer: customerId,
      success_url: `${origin}/padres/pagos?autopay={CHECKOUT_SESSION_ID}&s=${studentId}`,
      cancel_url: `${origin}/padres/pagos`,
    },
    { stripeAccount: school.stripeAccountId }
  );

  if (!checkout.url) redirect("/padres/pagos");
  redirect(checkout.url);
}

/** Desactiva el pago automático de un hijo. */
export async function disableAutopay(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const session = await requireAuth();
  if (studentId && (await isGuardianOf(session.user.id, studentId))) {
    await db
      .update(autopay)
      .set({ status: "off" })
      .where(eq(autopay.studentId, studentId));
  }
  revalidatePath("/padres/pagos");
}

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

  if (charge.kind === "monthly") {
    const today = billingDate();
    await generateMonthlyCharges(charge.schoolId, today.slice(0, 7), today, charge.studentId, false);
  }

  const acct = { stripeAccount: school.stripeAccountId };
  const url = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(charges)
      .where(and(eq(charges.id, chargeId), eq(charges.status, "pending"))).for("update");
    if (!current || current.stripePaymentIntentId || current.amountCents <= 0) return null;
    if (current.stripeCheckoutId) {
      const prior = await stripe.checkout.sessions.retrieve(current.stripeCheckoutId, undefined, acct);
      if (prior.status === "open") return prior.url;
      if (prior.status === "complete") return null;
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: current.currency.toLowerCase(),
          product_data: { name: current.description },
          unit_amount: current.amountCents,
        },
        quantity: 1,
      }],
      metadata: { chargeId: current.id },
      payment_intent_data: { metadata: { chargeId: current.id } },
      success_url: `${origin}/padres/pagos?confirm={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/padres/pagos`,
    }, acct);

    await tx.update(charges).set({ stripeCheckoutId: checkout.id }).where(eq(charges.id, chargeId));
    return checkout.url;
  });
  redirect(url ?? "/padres/pagos");
}
