import { asc, desc } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { requireFeature } from "@/lib/plan";
import { tenantDb } from "@/lib/tenant-db";
import {
  expenses as expensesTable,
  categories as categoriesTable,
} from "@/db/schema";
import { formatMoney } from "@/lib/billing";
import {
  EXPENSE_CATEGORY_LABELS,
  monthOf,
  sumExpenses,
  type ExpenseCategory,
} from "@/lib/finance";
import { PageHeader, Card } from "@/components/ui";
import { CreateExpenseForm } from "./forms";
import { deleteExpense } from "./actions";

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { membership } = await requireRole(ADMIN_ROLES);
  requireFeature(membership.school.plan, "expenses");

  const { mes } = await searchParams;
  const period = mes || monthOf(new Date());

  const tdb = tenantDb(membership.schoolId);
  const [expenses, categories] = await Promise.all([
    tdb.expenses.findMany({
      with: { category: true },
      orderBy: [desc(expensesTable.spentOn)],
    }),
    tdb.categories.findMany({ orderBy: [asc(categoriesTable.name)] }),
  ]);

  const monthExpenses = expenses.filter(
    (e) => e.spentOn.slice(0, 7) === period
  );
  const monthTotal = sumExpenses(expenses, period);
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Gastos"
        title="Gastos operativos"
        subtitle="Registra los egresos de la escuela: nómina, arbitrajes, renta, material y más."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="rounded-2xl border border-ink/10 bg-white/80 px-5 py-4 shadow-sm">
              <p className="text-sm text-ink-soft">Gastos del mes</p>
              <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-tangerine">
                {formatMoney(monthTotal)}
              </p>
            </div>
            <form method="get" className="flex items-end gap-2">
              <label className="text-xs text-ink-soft">
                <span className="mb-1 block">Mes</span>
                <input
                  type="month"
                  name="mes"
                  defaultValue={period}
                  className="rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-sm text-ink shadow-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink"
              >
                Filtrar
              </button>
            </form>
          </div>

          {monthExpenses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              No hay gastos registrados en este mes.
            </p>
          ) : (
            <ul className="space-y-2">
              {monthExpenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {e.description}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory]} ·{" "}
                      {fmtDate(e.spentOn)}
                      {e.category ? "" : ""}
                      {e.categoryId && e.category
                        ? ` · ${e.category.name}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display font-bold text-ink">
                      {formatMoney(e.amountCents, e.currency)}
                    </span>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-ink">Nuevo gasto</p>
            <CreateExpenseForm categories={categoryOptions} />
          </Card>
        </div>
      </div>
    </div>
  );
}
