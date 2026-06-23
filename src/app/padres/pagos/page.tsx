import { getActiveMembership } from "@/lib/tenant";
import {
  getMyChildrenCharges,
  formatMoney,
  periodLabel,
  CHARGE_STATUS_LABELS,
} from "@/lib/billing";
import { confirmCheckoutForUser } from "@/lib/stripe";
import { PageHeader, EmptyState } from "@/components/ui";
import { payCharge } from "./actions";

export default async function PadresPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; nopay?: string }>;
}) {
  const { confirm, nopay } = await searchParams;
  const { session } = await getActiveMembership();

  // Al volver del pago, confirma la sesión y marca el cargo (sin depender del webhook).
  let justPaid = false;
  if (confirm) {
    justPaid = await confirmCheckoutForUser(session.user.id, confirm);
  }

  const charges = await getMyChildrenCharges(session.user.id);
  const pending = charges.filter((c) => c.status === "pending");
  const history = charges.filter((c) => c.status !== "pending");
  const pendingSum = pending.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Pagos"
        title="Pagos"
        subtitle={
          pending.length
            ? `Tienes ${pending.length} cargo${pending.length === 1 ? "" : "s"} por pagar · ${formatMoney(pendingSum)}.`
            : "Aquí verás las cuotas y cobros de tus hijos."
        }
      />

      {justPaid && (
        <div className="mb-5 rounded-2xl border border-pitch/30 bg-pitch/[0.06] p-4 text-sm text-ink">
          ¡Pago recibido! Gracias. 🎉
        </div>
      )}
      {nopay && (
        <div className="mb-5 rounded-2xl border border-tangerine/30 bg-tangerine/[0.07] p-4 text-sm text-ink-soft">
          Esta escuela aún no tiene activado el pago en línea. Te indicará cómo
          realizar el pago.
        </div>
      )}

      {charges.length === 0 ? (
        <EmptyState
          title="Sin cargos por ahora"
          description="Cuando tu escuela genere cuotas o cobros, aparecerán aquí."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg font-bold">Por pagar</h2>
              <ul className="space-y-2">
                {pending.map((c) => (
                  <ChargeRow key={c.id} charge={c} highlight payable />
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Historial</h2>
              <ul className="space-y-2">
                {history.map((c) => (
                  <ChargeRow key={c.id} charge={c} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type ChargeRowData = {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  periodMonth: string | null;
  status: string;
  student: { firstName: string; lastName: string };
};

function ChargeRow({
  charge,
  highlight = false,
  payable = false,
}: {
  charge: ChargeRowData;
  highlight?: boolean;
  payable?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${
        highlight ? "border-tangerine/30 bg-tangerine/[0.05]" : "border-ink/10 bg-white/80"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{charge.description}</p>
        <p className="truncate text-xs text-ink-soft">
          {charge.student.firstName} {charge.student.lastName}
          {charge.periodMonth ? ` · ${periodLabel(charge.periodMonth)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="font-display font-bold text-ink">
            {formatMoney(charge.amountCents, charge.currency)}
          </span>
          <StatusBadge status={charge.status} />
        </div>
        {payable && (
          <form action={payCharge}>
            <input type="hidden" name="chargeId" value={charge.id} />
            <button
              type="submit"
              className="rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
            >
              Pagar
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-tangerine/15 text-tangerine",
    paid: "bg-pitch/15 text-pitch",
    failed: "bg-red-100 text-red-700",
    canceled: "bg-ink/10 text-ink-soft",
    refunded: "bg-ink/10 text-ink-soft",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-ink/10 text-ink-soft"}`}
    >
      {CHARGE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
