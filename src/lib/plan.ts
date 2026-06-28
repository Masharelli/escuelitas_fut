import { redirect } from "next/navigation";

export type SchoolPlan = "basic" | "pro" | "premium";

export const PLAN_LABELS: Record<SchoolPlan, string> = {
  basic: "Básico",
  pro: "Profesional",
  premium: "Premium",
};

const PLAN_RANK: Record<SchoolPlan, number> = {
  basic: 0,
  pro: 1,
  premium: 2,
};

/** Módulos por nivel mínimo de plan (Fase H). */
export type Feature =
  | "stats" // estadísticas deportivas
  | "reports" // reportes financieros / export
  | "expenses" // contabilidad operativa (gastos)
  | "exec_dashboard" // dashboard ejecutivo (utilidad, punto de equilibrio)
  | "branding"; // logo/colores propios en el portal público

export const FEATURE_MIN_PLAN: Record<Feature, SchoolPlan> = {
  stats: "pro",
  reports: "pro",
  expenses: "premium",
  exec_dashboard: "premium",
  branding: "premium",
};

/** ¿El plan habilita la funcionalidad? */
export function hasFeature(
  plan: SchoolPlan | string | null | undefined,
  feature: Feature
): boolean {
  const p = (plan ?? "basic") as SchoolPlan;
  return PLAN_RANK[p] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/** Exige la funcionalidad o redirige (para guardar páginas). */
export function requireFeature(
  plan: SchoolPlan | string | null | undefined,
  feature: Feature,
  fallback = "/admin"
): void {
  if (!hasFeature(plan, feature)) redirect(fallback);
}
