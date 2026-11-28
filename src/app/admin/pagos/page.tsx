import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, isNull, lt, or } from "drizzle-orm";

import { charges as chargesTable, categories as categoriesTable, students as studentsTable } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  formatMoney,
  formatDueDate,
  periodLabel,
  currentPeriod,
  isOverdue,
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  type ChargeKind,
} from "@/lib/billing";
import { isBillingPeriod } from "@/lib/billing-rules";
import { addMonths } from "@/lib/calendar";
import { PageHeader, EmptyState } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { PortalIcon } from "@/components/portal/portal-icon";
import { CobroDialog, PaymentMonthField } from "./payment-controls";
import { markChargePaid, cancelCharge } from "./actions";

const CHARGE_GROUPS = {
  vencido: { title: "Vencidos", tone: "bg-red-50", dot: "bg-red-600", expanded: true },
  pending: { title: "Pendientes", tone: "bg-tertiary-container/60", dot: "bg-amber-600", expanded: true },
  paid: { title: "Pagados", tone: "bg-primary-container/65", dot: "bg-pitch", expanded: false },
  canceled: { title: "Cancelados", tone: "bg-surface-container", dot: "bg-outline", expanded: false },
  refunded: { title: "Reembolsados", tone: "bg-surface-container", dot: "bg-outline", expanded: false },
  failed: { title: "Fallidos", tone: "bg-red-50", dot: "bg-red-600", expanded: false },
} as const;

type GroupStatus = keyof typeof CHARGE_GROUPS;
type ListedCharge = Pick<typeof chargesTable.$inferSelect, "id" | "status" | "description" | "amountCents" | "currency" | "dueDate"> & {
  student: { firstName: string; lastName: string };
};

function monthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    mes?: string;
    estado?: string;
    tipo?: string;
    alumno?: string;
  }>;
}) {
  const [{ connected, mes, estado, tipo, alumno }, { membership }] = await Promise.all([
    searchParams,
    requireRole(ADMIN_ROLES),
  ]);
  if (membership.role !== "owner") return <OperationalPayments schoolId={membership.schoolId} studentId={alumno} />;
  if (connected) redirect("/admin/cuotas?connected=1#configuracion");

  const period = isBillingPeriod(mes) ? mes : currentPeriod();
  const start = new Date(`${period}-01T00:00:00`);
  const end = addMonths(start, 1);
  const previousPeriod = monthParam(addMonths(start, -1));
  const nextPeriod = monthParam(end);
  const tdb = tenantDb(membership.schoolId);

  const [categories, students, charges] = await Promise.all([
    tdb.categories.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(categoriesTable.name)],
    }),
    tdb.students.findMany({
      where: eq(studentsTable.status, "active"),
      orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
      columns: { id: true, firstName: true, lastName: true },
    }),
    tdb.charges.findMany({
      where: or(
        eq(chargesTable.periodMonth, period),
        and(
          or(isNull(chargesTable.periodMonth), eq(chargesTable.periodMonth, "")),
          gte(chargesTable.createdAt, start),
          lt(chargesTable.createdAt, end),
        ),
      ),
      columns: { id: true, kind: true, status: true, description: true, amountCents: true, currency: true, dueDate: true },
      with: { student: { columns: { firstName: true, lastName: true } } },
      orderBy: [desc(chargesTable.createdAt)],
    }),
  ]);

  const groups = new Map<GroupStatus, ListedCharge[]>();
  for (const charge of charges) {
    if (tipo && charge.kind !== tipo) continue;
    const status = isOverdue(charge) ? "vencido" : charge.status;
    if (estado && estado !== charge.status && estado !== status) continue;
    const group = groups.get(status);
    if (group) group.push(charge);
    else groups.set(status, [charge]);
  }

  const filters = new URLSearchParams();
  if (estado) filters.set("estado", estado);
  if (tipo) filters.set("tipo", tipo);
  function monthHref(value: string) {
    const query = new URLSearchParams(filters);
    query.set("mes", value);
    return `/admin/pagos?${query}`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Pagos"
        subtitle="Consulta cargos y registra pagos."
        action={
          <nav aria-label="Mes de cobro" className="inline-flex max-w-full items-stretch rounded-xl border border-outline-variant bg-surface-container text-pitch">
            {isBillingPeriod(previousPeriod) && (
              <Link href={monthHref(previousPeriod)} rel="prev" aria-label="Mes anterior" className="flex size-12 shrink-0 items-center justify-center rounded-s-xl border-e border-outline-variant hover:bg-primary-container">
                <Chevron className="rotate-180" />
              </Link>
            )}
            <PaymentMonthField key={period} period={period} label={periodLabel(period)} filters={filters.toString()} />
            {isBillingPeriod(nextPeriod) && (
              <Link href={monthHref(nextPeriod)} rel="next" aria-label="Mes siguiente" className="flex size-12 shrink-0 items-center justify-center rounded-e-xl border-s border-outline-variant hover:bg-primary-container">
                <Chevron />
              </Link>
            )}
          </nav>
        }
      />

      <div className="mb-5 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="[&>div]:mb-0">
          <FilterBar selects={[
            {
              key: "tipo",
              label: "Filtrar por tipo de cargo",
              allLabel: "Todos los tipos",
              icon: "payments",
              options: (Object.keys(KIND_LABELS) as ChargeKind[]).map((value) => ({ value, label: KIND_LABELS[value] })),
            },
            {
              key: "estado",
              label: "Filtrar por estado",
              allLabel: "Todos los estados",
              icon: "attendance",
              options: [
                { value: "pending", label: "Pendiente" },
                { value: "vencido", label: "Vencido" },
                { value: "paid", label: "Pagado" },
                { value: "canceled", label: "Cancelado" },
              ],
            },
          ]} />
        </div>
        <div>
          <CobroDialog
            categories={categories.map(({ id, name }) => ({ value: id, label: name }))}
            students={students.map(({ id, firstName, lastName }) => ({ value: id, label: `${firstName} ${lastName}` }))}
          />
        </div>
      </div>

      {groups.size === 0 ? (
        <EmptyState
          icon={<PortalIcon icon="payments" />}
          title={charges.length > 0 ? "No hay cargos con esos filtros" : "No hay cargos en este mes"}
          description={charges.length > 0 ? "Prueba con otro tipo o estado." : "Las mensualidades aparecen a partir del día programado. También puedes consultar otro mes o crear un cobro único."}
        />
      ) : (
        <div className="space-y-4">
          {(Object.keys(CHARGE_GROUPS) as GroupStatus[]).map((status) => {
            const items = groups.get(status);
            return items && <ChargeGroup key={`${period}-${status}`} status={status} charges={items} />;
          })}
        </div>
      )}
    </div>
  );
}

function ChargeGroup({ status, charges }: { status: GroupStatus; charges: ListedCharge[] }) {
  const { title, tone, dot, expanded } = CHARGE_GROUPS[status];
  const totals = new Map<string, number>();
  for (const charge of charges) {
    totals.set(charge.currency, (totals.get(charge.currency) ?? 0) + charge.amountCents);
  }

  return (
    <details open={expanded} className="group overflow-hidden rounded-2xl border border-outline-variant bg-surface">
      <summary className={`flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-4 py-3 focus-visible:-outline-offset-2 sm:gap-4 sm:px-5 ${tone}`}>
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dot}`} />
        <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
          <span className="block font-display text-xl font-bold leading-tight">{title}</span>
          <span className="block text-sm text-ink-soft sm:border-s sm:border-outline-variant sm:ps-4">
            {charges.length} {charges.length === 1 ? "cargo" : "cargos"} · {Array.from(totals, ([currency, cents]) => formatMoney(cents, currency)).join(" · ")}
          </span>
        </span>
        <Chevron className="shrink-0 text-pitch group-open:rotate-90" />
      </summary>
      <ul className="divide-y divide-outline-variant border-t border-outline-variant">
        {charges.map((charge) => (
          <li key={charge.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(6rem,auto)_auto] xl:gap-x-5">
            <span className="font-semibold">{charge.student.firstName} {charge.student.lastName}</span>
            <span className="col-start-1 row-start-2 text-sm text-ink-soft xl:col-start-2 xl:row-start-1">
              {charge.description}
              {charge.status === "pending" && charge.dueDate && (
                <span className="block text-xs">Vence el {formatDueDate(charge.dueDate)}</span>
              )}
            </span>
            <div className="col-start-2 row-start-1 text-right text-base font-bold tabular-nums xl:col-start-3">
              {formatMoney(charge.amountCents, charge.currency)}
            </div>
            {charge.status === "pending" && (
              <div className="col-span-full flex flex-wrap justify-end gap-2 xl:col-span-1 xl:col-start-4 xl:row-start-1">
                <ChargeAction action={cancelCharge} id={charge.id} label="Cancelar cargo" />
                <ChargeAction action={markChargePaid} id={charge.id} label="Marcar pagado" primary />
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChargeAction({ action, id, label, primary = false }: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`md-button min-h-11 px-3 py-1.5 text-xs ${primary ? "md-tonal" : "md-outlined"}`}>
        {label}
      </button>
    </form>
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

/** La operación consulta cargos por alumno, sin cargar el libro global. */
async function OperationalPayments({ schoolId, studentId }: { schoolId: string; studentId?: string }) {
  const tdb = tenantDb(schoolId);
  const students = await tdb.students.findMany({
    columns: { id: true, firstName: true, lastName: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });
  const selected = students.find((s) => s.id === studentId);
  const charges = selected ? await tdb.charges.findMany({
    where: eq(chargesTable.studentId, selected.id), orderBy: [desc(chargesTable.createdAt)],
  }) : [];
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader eyebrow="Operación" title="Registrar pagos" subtitle="Consulta los cargos autorizados por el dueño y registra los pagos de cada alumno." />
      <form method="get" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0 text-sm text-ink-soft">Alumno
          <select name="alumno" required defaultValue={selected?.id ?? ""} className="mt-1 block w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-ink">
            <option value="">Selecciona un alumno</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </label>
        <button className="rounded-full bg-pitch px-5 py-2.5 text-sm font-semibold text-chalk">Consultar</button>
      </form>
      {selected && (charges.length ? <ul className="space-y-3">{charges.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4">
          <div><p className="font-semibold">{c.description}</p><p className="text-sm text-ink-soft">{formatMoney(c.amountCents, c.currency)}{c.periodMonth ? ` · ${periodLabel(c.periodMonth)}` : ""}</p></div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={c.status} />{c.status === "pending" && <form action={markChargePaid}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="studentId" value={selected.id} /><button className="min-h-11 rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-chalk">Registrar pago</button></form>}</div>
        </li>
      ))}</ul> : <p className="text-sm text-ink-soft">Este alumno no tiene cargos registrados.</p>)}
    </div>
  );
}
