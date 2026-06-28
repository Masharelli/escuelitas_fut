import type { expenseCategory } from "@/db/schema";

export type ExpenseCategory = (typeof expenseCategory.enumValues)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  nomina: "Nómina de entrenadores",
  arbitraje: "Arbitrajes",
  renta_campo: "Renta de campos",
  material: "Material deportivo",
  viaje: "Viajes",
  uniforme: "Uniformes",
  otro: "Otro",
};

export const EXPENSE_CATEGORY_OPTIONS: {
  value: ExpenseCategory;
  label: string;
}[] = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(
  (value) => ({ value, label: EXPENSE_CATEGORY_LABELS[value] })
);

/** Mes "YYYY-MM" de una fecha. */
export function monthOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type PaidCharge = {
  amountCents: number;
  status: string;
  paidAt: Date | null;
  student?: { categoryId: string | null } | null;
};

type Expense = {
  amountCents: number;
  spentOn: string; // YYYY-MM-DD
  categoryId: string | null;
};

/** Suma de gastos de un periodo "YYYY-MM" (o todos si no se da periodo). */
export function sumExpenses(rows: Expense[], period?: string): number {
  return rows
    .filter((e) => !period || e.spentOn.slice(0, 7) === period)
    .reduce((s, e) => s + e.amountCents, 0);
}

/** Suma de ingresos cobrados en un periodo "YYYY-MM". */
export function sumIncome(rows: PaidCharge[], period: string): number {
  return rows
    .filter(
      (c) => c.status === "paid" && c.paidAt && monthOf(c.paidAt) === period
    )
    .reduce((s, c) => s + c.amountCents, 0);
}

export type FinanceSummary = {
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
  marginPct: number; // utilidad / ingresos
  coveragePct: number; // ingresos / gastos (punto de equilibrio)
};

/** Resumen ejecutivo de un periodo: utilidad, margen y cobertura (equilibrio). */
export function financeSummary(
  charges: PaidCharge[],
  expenses: Expense[],
  period: string
): FinanceSummary {
  const incomeCents = sumIncome(charges, period);
  const expensesCents = sumExpenses(expenses, period);
  const profitCents = incomeCents - expensesCents;
  return {
    incomeCents,
    expensesCents,
    profitCents,
    marginPct: incomeCents > 0 ? Math.round((profitCents / incomeCents) * 100) : 0,
    coveragePct:
      expensesCents > 0 ? Math.round((incomeCents / expensesCents) * 100) : 0,
  };
}

export type CategoryProfitRow = {
  categoryId: string | null;
  name: string;
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
};

/**
 * Rentabilidad por categoría deportiva en un periodo: ingresos de los alumnos de
 * la categoría menos los gastos imputados a ella. Incluye un grupo "Sin
 * categoría" para lo no asignado.
 */
export function profitByCategory(
  charges: PaidCharge[],
  expenses: Expense[],
  categories: { id: string; name: string }[],
  period: string
): CategoryProfitRow[] {
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  const NONE = "__none__";

  for (const c of charges) {
    if (c.status !== "paid" || !c.paidAt || monthOf(c.paidAt) !== period) continue;
    const key = c.student?.categoryId ?? NONE;
    income.set(key, (income.get(key) ?? 0) + c.amountCents);
  }
  for (const e of expenses) {
    if (e.spentOn.slice(0, 7) !== period) continue;
    const key = e.categoryId ?? NONE;
    expense.set(key, (expense.get(key) ?? 0) + e.amountCents);
  }

  const rows: CategoryProfitRow[] = categories.map((cat) => {
    const incomeCents = income.get(cat.id) ?? 0;
    const expensesCents = expense.get(cat.id) ?? 0;
    return {
      categoryId: cat.id,
      name: cat.name,
      incomeCents,
      expensesCents,
      profitCents: incomeCents - expensesCents,
    };
  });

  const noneIncome = income.get(NONE) ?? 0;
  const noneExpense = expense.get(NONE) ?? 0;
  if (noneIncome || noneExpense) {
    rows.push({
      categoryId: null,
      name: "Sin categoría",
      incomeCents: noneIncome,
      expensesCents: noneExpense,
      profitCents: noneIncome - noneExpense,
    });
  }

  return rows.filter((r) => r.incomeCents > 0 || r.expensesCents > 0);
}
