import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { Card, PageHeader, SecondaryLink } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";
import { categories as categoriesTable, plans as plansTable } from "@/db/schema";
import { currentPeriod, formatMoney, KIND_LABELS } from "@/lib/billing";
import { isBillingPeriod } from "@/lib/billing-rules";
import { refreshConnectStatus } from "@/lib/stripe";
import { ADMIN_ROLES, requireRole } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { connectStripe, deletePlan } from "../pagos/actions";
import { BillingScheduleForm, CreatePlanForm, GenerateChargesForm } from "../pagos/forms";

export default async function CuotasPage({ searchParams }: {
  searchParams: Promise<{ connected?: string; mes?: string }>;
}) {
  const [{ membership }, { connected, mes }] = await Promise.all([
    requireRole(ADMIN_ROLES),
    searchParams,
  ]);
  if (membership.role !== "owner") redirect("/admin/pagos");
  const { school, schoolId } = membership;
  const tdb = tenantDb(schoolId);
  const period = isBillingPeriod(mes) ? mes : currentPeriod();
  const [plans, categories, stripeStatus] = await Promise.all([
    tdb.plans.findMany({
      with: { category: true },
      orderBy: [asc(plansTable.kind), asc(plansTable.name)],
    }),
    tdb.categories.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(categoriesTable.name)],
    }),
    connected && school.stripeAccountId && !school.stripeChargesEnabled
      ? refreshConnectStatus(schoolId, school.stripeAccountId)
      : null,
  ]);
  const chargesEnabled = stripeStatus?.chargesEnabled ?? school.stripeChargesEnabled;
  const categoryOptions = categories.map(({ id, name }) => ({ value: id, label: name }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Cuotas y planes"
        subtitle="Consulta el calendario de mensualidades y administra tus planes y cobros."
        action={<SecondaryLink href={`/admin/pagos?mes=${period}`}>Ver pagos</SecondaryLink>}
      />

      <div className="space-y-6">
        <section id="generar-cuotas" aria-labelledby="cuotas-title" className="scroll-mt-4">
          <Card>
            <h2 id="cuotas-title" className="flex items-center gap-2 font-display text-xl font-bold">
              <span className="text-pitch"><PortalIcon icon="calendar" size={20} /></span>
              Mensualidades
            </h2>
            <p className="mt-2 text-sm text-ink-soft">Las cuotas se generan automáticamente a partir del día {school.paymentGenerationDay} de cada mes.</p>
            <details className="mt-4 max-w-sm rounded-xl border border-outline-variant">
              <summary className="cursor-pointer rounded-xl bg-surface-container px-4 py-3 text-sm font-semibold text-pitch focus-visible:-outline-offset-2">
                Generar manualmente
              </summary>
              <div className="p-4">
                <GenerateChargesForm key={period} currentPeriod={period} />
              </div>
            </details>
          </Card>
        </section>

        <section aria-labelledby="planes-title">
          <Card>
            <h2 id="planes-title" className="flex items-center gap-2 font-display text-xl font-bold">
              <span className="text-pitch"><PortalIcon icon="payments" size={20} /></span>
              Planes
            </h2>
            <details className="mt-4 rounded-xl border border-outline-variant" open={plans.length === 0}>
              <summary className="cursor-pointer rounded-xl bg-surface-container px-4 py-3 font-semibold text-pitch focus-visible:-outline-offset-2">Nuevo plan</summary>
              <div className="max-w-md p-4">
                <CreatePlanForm categories={categoryOptions} />
              </div>
            </details>

            {plans.length > 0 ? (
              <ul className="mt-4 divide-y divide-outline-variant rounded-xl border border-outline-variant">
                {plans.map((plan) => (
                  <li key={plan.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{plan.name}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {KIND_LABELS[plan.kind]} · {plan.category?.name ?? "Toda la escuela"}
                          {!plan.active && " · Inactivo"}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatMoney(plan.amountCents, plan.currency)}</p>
                    </div>
                    <div className="mt-2 grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <details className="max-w-md">
                        <summary className="cursor-pointer py-3 text-sm font-medium text-pitch">Editar plan</summary>
                        <div className="pb-2">
                          <CreatePlanForm categories={categoryOptions} plan={plan} />
                        </div>
                      </details>
                      <form action={deletePlan}>
                        <input type="hidden" name="id" value={plan.id} />
                        <button type="submit" aria-label={`Eliminar plan ${plan.name}`} data-glass-tone="danger" className="md-button md-outlined min-h-11 px-3 text-xs">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-soft">Aún no tienes planes.</p>}
          </Card>
        </section>

        <section id="configuracion" aria-labelledby="configuracion-title" className="scroll-mt-4">
          <Card>
            <h2 id="configuracion-title" className="font-display text-xl font-bold">Configuración</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container/50 p-4">
                <h3 className="font-semibold">Calendario de mensualidades</h3>
                <BillingScheduleForm
                  key={schoolId}
                  generationDay={school.paymentGenerationDay}
                  dueDay={school.paymentDueDay}
                />
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container/50 p-4">
                <h3 className="font-semibold">Cobros en línea</h3>
                {chargesEnabled ? (
                  <p className="mt-2 text-sm text-pitch">Los cobros con tarjeta están activos.</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-ink-soft">
                      {school.stripeAccountId
                        ? "Termina de configurar tu cuenta de Stripe para aceptar pagos con tarjeta."
                        : "Conecta Stripe para que las familias puedan pagar con tarjeta."}
                    </p>
                    <form action={connectStripe} className="mt-3">
                      <button type="submit" className="md-button md-outlined">
                        {school.stripeAccountId ? "Terminar configuración" : "Conectar pagos"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
