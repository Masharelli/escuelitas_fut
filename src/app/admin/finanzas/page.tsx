import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { hasFeature } from "@/lib/plan";
import { tenantDb } from "@/lib/tenant-db";
import { charges as chargesTable, students as studentsTable } from "@/db/schema";
import {
  formatMoney,
  periodLabel,
  summarizeCharges,
  isOverdue,
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  type ChargeKind,
} from "@/lib/billing";
import {
  financeSummary,
  profitByCategory,
  monthOf,
  type CategoryProfitRow,
} from "@/lib/finance";
import { PageHeader } from "@/components/ui";
import { markChargePaid, cancelCharge } from "./actions";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "canceled", label: "Cancelado" },
];

/** Mes "YYYY-MM" efectivo del cargo: su periodo, o el mes en que se creó. */
function effectiveMonth(c: { periodMonth: string | null; createdAt: Date }) {
  if (c.periodMonth) return c.periodMonth;
  const d = c.createdAt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; estado?: string; q?: string }>;
}) {
  const { mes, estado, q } = await searchParams;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const charges = await tdb.charges.findMany({
    with: { student: true },
    orderBy: [desc(chargesTable.createdAt)],
  });

  const summary = summarizeCharges(charges, new Date());

  // Bloque ejecutivo (Premium): utilidad, margen y rentabilidad por categoría.
  const showExec = hasFeature(membership.school.plan, "exec_dashboard");
  const period = monthOf(new Date());
  let exec: ReturnType<typeof financeSummary> | null = null;
  let categoryProfit: CategoryProfitRow[] = [];
  if (showExec) {
    const [expenses, categories] = await Promise.all([
      tdb.expenses.findMany(),
      tdb.categories.findMany(),
    ]);
    exec = financeSummary(charges, expenses, period);
    categoryProfit = profitByCategory(charges, expenses, categories, period);
  }

  // Lista filtrada por mes y estado.
  const filtered = charges.filter((c) => {
    if (estado && c.status !== estado) return false;
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

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Finanzas"
        title="Finanzas"
        subtitle="Resumen de cobros, estado de cuenta por alumno y registro de pagos."
      />

      {/* Resumen */}
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
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Cargos</h2>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            {q && <input type="hidden" name="q" value={q} />}
            <label className="text-xs text-ink-soft">
              <span className="mb-1 block">Mes</span>
              <input
                type="month"
                name="mes"
                defaultValue={mes ?? ""}
                className="rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-sm text-ink shadow-sm"
              />
            </label>
            <label className="text-xs text-ink-soft">
              <span className="mb-1 block">Estado</span>
              <select
                name="estado"
                defaultValue={estado ?? ""}
                className="rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-sm text-ink shadow-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink"
            >
              Filtrar
            </button>
          </form>
          <a
            href={`/admin/finanzas/export${exportQs.size ? `?${exportQs}` : ""}`}
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            Exportar CSV
          </a>
        </div>
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
              className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/finanzas/${c.studentId}`}
                  className="block truncate font-semibold text-ink hover:text-pitch"
                >
                  {c.student.firstName} {c.student.lastName}
                </Link>
                <p className="truncate text-xs text-ink-soft">
                  {c.description} · {KIND_LABELS[c.kind as ChargeKind]}
                  {c.periodMonth ? ` · ${periodLabel(c.periodMonth)}` : ""}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
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
