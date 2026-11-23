import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";

import { requireRole, OWNER_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { charges as chargesTable, students as studentsTable } from "@/db/schema";
import {
  formatMoney,
  formatDueDate,
  periodLabel,
  summarizeCharges,
  effectiveMonth,
  isOverdue,
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  type ChargeKind,
} from "@/lib/billing";
import { waLink } from "@/lib/whatsapp";
import { FilterBar } from "@/components/filter-bar";
import {
  financeSummary,
  profitByCategory,
  monthOf,
} from "@/lib/finance";
import { PageHeader } from "@/components/ui";
import { markChargePaid, cancelCharge } from "./actions";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "vencido", label: "Vencido" },
  { value: "paid", label: "Pagado" },
  { value: "canceled", label: "Cancelado" },
];

const KIND_OPTIONS = (Object.keys(KIND_LABELS) as ChargeKind[]).map((k) => ({
  value: k,
  label: KIND_LABELS[k],
}));

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; estado?: string; tipo?: string; q?: string }>;
}) {
  const { mes, estado, tipo, q } = await searchParams;
  const { membership } = await requireRole(OWNER_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const charges = await tdb.charges.findMany({
    with: { student: true },
    orderBy: [desc(chargesTable.createdAt)],
  });

  const summary = summarizeCharges(charges, new Date());

  // El dueño puede consultar las finanzas de toda su escuela.
  const period = monthOf(new Date());
  const [expenses, categories] = await Promise.all([
    tdb.expenses.findMany(),
    tdb.categories.findMany(),
  ]);
  const exec = financeSummary(charges, expenses, period);
  const allExpensesCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const allIncomeCents = charges.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amountCents, 0);
  const categoryProfit = profitByCategory(charges, expenses, categories, period);

  // Lista filtrada por mes, estado (incluye "vencido") y tipo de cobro.
  const filtered = charges.filter((c) => {
    if (estado === "vencido") {
      if (!isOverdue(c)) return false;
    } else if (estado && c.status !== estado) {
      return false;
    }
    if (tipo && c.kind !== tipo) return false;
    if (mes && effectiveMonth(c) !== mes) return false;
    return true;
  });

  // Búsqueda de alumno → su saldo pendiente.
  let studentResults: { id: string; name: string; pending: number }[] = [];
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    const found = await tdb.students.findMany({
      where: or(
        ilike(studentsTable.firstName, like),
        ilike(studentsTable.lastName, like),
        sql`(${studentsTable.firstName} || ' ' || ${studentsTable.lastName}) ilike ${like}`
      ),
      columns: { id: true, firstName: true, lastName: true },
      limit: 12,
    });
    studentResults = found.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      pending: charges
        .filter((c) => c.studentId === s.id && c.status === "pending")
        .reduce((sum, c) => sum + c.amountCents, 0),
    }));
  }

  const exportQs = new URLSearchParams();
  if (mes) exportQs.set("mes", mes);
  if (estado) exportQs.set("estado", estado);
  if (tipo) exportQs.set("tipo", tipo);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Finanzas"
        title="Finanzas"
        subtitle="Resumen de cobros, estado de cuenta por alumno y registro de pagos."
      />

      {/* Resumen */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Ingresos acumulados" value={formatMoney(allIncomeCents)} tone="pitch" />
        <SummaryCard label="Egresos acumulados" value={formatMoney(allExpensesCents)} tone="tangerine" />
        <SummaryCard label="Resultado acumulado" value={formatMoney(allIncomeCents - allExpensesCents)} />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Cobrado este mes"
          value={formatMoney(summary.paidThisMonthCents)}
          tone="pitch"
        />
        <SummaryCard
          label="Pendiente por cobrar"
          value={formatMoney(summary.pendingCents)}
          tone="tangerine"
        />
        <SummaryCard
          label="Cargos pendientes"
          value={String(summary.pendingCount)}
        />
      </div>

      {exec && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              Dashboard ejecutivo
            </h2>
            <a
              href="/admin/gastos"
              className="text-sm font-medium text-pitch hover:text-pitch-deep"
            >
              Gestionar gastos
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryCard label="Ingresos del mes" value={formatMoney(exec.incomeCents)} tone="pitch" />
            <SummaryCard label="Gastos del mes" value={formatMoney(exec.expensesCents)} tone="tangerine" />
            <SummaryCard
              label="Utilidad del mes"
              value={formatMoney(exec.profitCents)}
              tone={exec.profitCents >= 0 ? "pitch" : "tangerine"}
            />
            <SummaryCard
              label="Punto de equilibrio"
              value={`${exec.coveragePct}%`}
            />
          </div>

          {categoryProfit.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Categoría</th>
                    <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                    <th className="px-3 py-2 text-right font-medium">Gastos</th>
                    <th className="px-3 py-2 text-right font-medium">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryProfit.map((r) => (
                    <tr key={r.categoryId ?? "none"} className="border-t border-ink/10">
                      <td className="px-3 py-2 text-ink">{r.name}</td>
                      <td className="px-3 py-2 text-right text-pitch">
                        {formatMoney(r.incomeCents)}
                      </td>
                      <td className="px-3 py-2 text-right text-tangerine">
                        {formatMoney(r.expensesCents)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          r.profitCents >= 0 ? "text-ink" : "text-red-600"
                        }`}
                      >
                        {formatMoney(r.profitCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Estado de cuenta por alumno */}
      <h2 className="font-display text-lg font-bold">Estado de cuenta por alumno</h2>
      <form method="get" className="mt-3 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Busca un alumno por nombre…"
          className="w-full max-w-sm rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
        <button
          type="submit"
          className="rounded-xl bg-pitch px-4 py-2.5 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
        >
          Buscar
        </button>
      </form>
      {q && (
        <ul className="mt-3 space-y-2">
          {studentResults.length === 0 ? (
            <li className="rounded-xl border border-dashed border-ink/15 bg-white/60 px-4 py-3 text-sm text-ink-soft">
              Sin alumnos que coincidan con “{q}”.
            </li>
          ) : (
            studentResults.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/finanzas/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30"
                >
                  <span className="font-semibold text-ink">{s.name}</span>
                  <span className="text-sm text-ink-soft">
                    {s.pending > 0 ? (
                      <span className="text-tangerine">
                        Debe {formatMoney(s.pending)}
                      </span>
                    ) : (
                      "Sin adeudos"
                    )}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      {/* Todos los cargos + filtros */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Cargos</h2>
        <a
          href={`/admin/finanzas/export${exportQs.size ? `?${exportQs}` : ""}`}
          className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          Exportar CSV
        </a>
      </div>
      <div className="mt-3">
        <FilterBar
          month={{ key: "mes" }}
          selects={[
            { key: "estado", allLabel: "Todos los estados", options: STATUS_OPTIONS },
            { key: "tipo", allLabel: "Todos los tipos", options: KIND_OPTIONS },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          No hay cargos con esos filtros.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.slice(0, 200).map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm xl:flex-row xl:items-center xl:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/finanzas/${c.studentId}`}
                  className="block font-semibold leading-snug text-ink hover:text-pitch"
                >
                  {c.student.firstName} {c.student.lastName}
                </Link>
                <p className="text-xs text-ink-soft">
                  {c.description} · {KIND_LABELS[c.kind as ChargeKind]}
                  {c.periodMonth ? ` · ${periodLabel(c.periodMonth)}` : ""}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                <span className="font-display font-bold text-ink">
                  {formatMoney(c.amountCents, c.currency)}
                </span>
                {isOverdue(c) ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Vencido
                  </span>
                ) : (
                  <StatusBadge status={c.status} />
                )}
                {c.status === "pending" && (
                  <>
                    <WhatsAppReminder
                      schoolName={membership.school.name}
                      charge={c}
                    />
                    <ChargeAction action={markChargePaid} id={c.id} label="Marcar pagado" primary />
                    <ChargeAction action={cancelCharge} id={c.id} label="Cancelar" />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pitch" | "tangerine";
}) {
  const valueClass =
    tone === "pitch"
      ? "text-pitch"
      : tone === "tangerine"
        ? "text-tangerine"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

/** Abre WhatsApp al tutor con el recordatorio del cargo prellenado. */
function WhatsAppReminder({
  schoolName,
  charge,
}: {
  schoolName: string;
  charge: {
    description: string;
    amountCents: number;
    currency: string;
    dueDate: string | null;
    student: {
      firstName: string;
      lastName: string;
      guardianName: string | null;
      guardianPhone: string | null;
    };
  };
}) {
  const s = charge.student;
  const due = charge.dueDate ? ` (vence el ${formatDueDate(charge.dueDate)})` : "";
  const text =
    `Hola${s.guardianName ? ` ${s.guardianName}` : ""} 👋. Te recordamos el pago de ` +
    `${charge.description} de ${s.firstName} ${s.lastName} por ` +
    `${formatMoney(charge.amountCents, charge.currency)}${due}. — ${schoolName}`;
  const href = waLink(s.guardianPhone, text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
    >
      WhatsApp
    </a>
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

function ChargeAction({
  action,
  id,
  label,
  primary = false,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value="/admin/finanzas" />
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
