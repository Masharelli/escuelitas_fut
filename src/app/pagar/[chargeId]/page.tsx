import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { leagueCharges, schools } from "@/db/schema";
import { confirmRegistrationCheckout } from "@/lib/league-billing";
import { formatMoney } from "@/lib/billing";
import { Wordmark } from "@/components/brand/wordmark";
import { payRegistration } from "./actions";

export default async function PagarPage({
  params,
  searchParams,
}: {
  params: Promise<{ chargeId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { chargeId } = await params;
  const { session } = await searchParams;

  const charge = await db.query.leagueCharges.findFirst({
    where: eq(leagueCharges.id, chargeId),
    with: { team: true, season: true },
  });
  if (!charge) notFound();

  let justPaid = false;
  if (session) {
    justPaid = await confirmRegistrationCheckout(chargeId, session);
  }
  const status = justPaid ? "paid" : charge.status;

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, charge.schoolId),
    columns: { name: true, stripeChargesEnabled: true },
  });
  const canPayOnline = !!school?.stripeChargesEnabled;

  return (
    <main className="flex min-h-screen items-center justify-center bg-chalk px-5 py-10 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Wordmark size="md" href={null} />
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-pitch">{school?.name ?? "Liga"}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
            {charge.description}
          </h1>
          <p className="mt-1 text-ink-soft">
            Equipo: <span className="font-semibold text-ink">{charge.team.name}</span>
          </p>

          <div className="my-6 rounded-xl bg-chalk-deep/60 px-4 py-3 text-center">
            <p className="text-xs text-ink-soft">Cuota de inscripción</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">
              {formatMoney(charge.amountCents, charge.currency)}
            </p>
          </div>

          {status === "paid" ? (
            <div className="rounded-xl border border-pitch/30 bg-pitch/[0.06] px-4 py-3 text-center text-sm font-medium text-ink">
              Pago recibido ✓ ¡Gracias! Tu equipo quedó inscrito.
            </div>
          ) : status === "canceled" ? (
            <div className="rounded-xl border border-ink/15 bg-chalk-deep/40 px-4 py-3 text-center text-sm text-ink-soft">
              Este cargo de inscripción fue cancelado.
            </div>
          ) : canPayOnline ? (
            <form action={payRegistration}>
              <input type="hidden" name="chargeId" value={charge.id} />
              <button
                type="submit"
                className="w-full rounded-full bg-pitch px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
              >
                Pagar {formatMoney(charge.amountCents, charge.currency)}
              </button>
              <p className="mt-3 text-center text-xs text-ink-soft">
                Pago seguro con tarjeta vía Stripe.
              </p>
            </form>
          ) : (
            <div className="rounded-xl border border-tangerine/30 bg-tangerine/[0.07] px-4 py-3 text-center text-sm text-ink-soft">
              Esta liga aún no tiene pagos en línea. El organizador te indicará
              cómo realizar el pago.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
