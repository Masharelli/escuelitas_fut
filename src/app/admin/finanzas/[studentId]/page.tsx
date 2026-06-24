import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { charges as chargesTable } from "@/db/schema";
import {
  formatMoney,
  periodLabel,
  pendingBalance,
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  type ChargeKind,
} from "@/lib/billing";
import { PageHeader } from "@/components/ui";
import { markChargePaid, cancelCharge, markChargePending } from "../actions";

export default async function EstadoCuentaPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const student = await tdb.students.findById(studentId);
  if (!student) notFound();

  const charges = await tdb.charges.findMany({
    where: eq(chargesTable.studentId, studentId),
    orderBy: [desc(chargesTable.createdAt)],
  });

  const pending = pendingBalance(charges);
  const paidTotal = charges
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amountCents, 0);

  const back = `/admin/finanzas/${studentId}`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/finanzas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Finanzas
      </Link>

      <PageHeader
        eyebrow="Estado de cuenta"
        title={`${student.firstName} ${student.lastName}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm">
          <p className="text-sm text-ink-soft">Saldo pendiente</p>
          <p className={`mt-1 font-display text-3xl font-extrabold ${pending > 0 ? "text-tangerine" : "text-pitch"}`}>
            {formatMoney(pending)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm">
          <p className="text-sm text-ink-soft">Pagado (histórico)</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink">
            {formatMoney(paidTotal)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Cargos</h2>
      {charges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          Este alumno no tiene cargos.
        </p>
      ) : (
        <ul className="space-y-2">
          {charges.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{c.description}</p>
                <p className="truncate text-xs text-ink-soft">
                  {KIND_LABELS[c.kind as ChargeKind]}
                  {c.periodMonth ? ` · ${periodLabel(c.periodMonth)}` : ""}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                <span className="font-display font-bold text-ink">
                  {formatMoney(c.amountCents, c.currency)}
                </span>
                <StatusBadge status={c.status} />
                {c.status === "pending" ? (
                  <>
                    <RowAction action={markChargePaid} id={c.id} back={back} label="Marcar pagado" primary />
                    <RowAction action={cancelCharge} id={c.id} back={back} label="Cancelar" />
                  </>
                ) : (
                  <RowAction action={markChargePending} id={c.id} back={back} label="Reabrir" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function RowAction({
  action,
  id,
  back,
  label,
  primary = false,
}: {
  action: (formData: FormData) => void;
  id: string;
  back: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          primary
            ? "bg-pitch text-chalk hover:bg-pitch-deep"
            : "border border-ink/15 text-ink-soft hover:text-ink"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
