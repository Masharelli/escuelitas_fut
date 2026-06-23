import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { refreshConnectStatus } from "@/lib/stripe";
import {
  charges as chargesTable,
  categories as categoriesTable,
  plans as plansTable,
  students as studentsTable,
  schools,
} from "@/db/schema";
import {
  formatMoney,
  periodLabel,
  currentPeriod,
  KIND_LABELS,
  CHARGE_STATUS_LABELS,
  type ChargeKind,
} from "@/lib/billing";
import { PageHeader, Card } from "@/components/ui";
import {
  CreatePlanForm,
  GenerateChargesForm,
  CreateOneOffChargeForm,
} from "./forms";
import {
  deletePlan,
  markChargePaid,
  cancelCharge,
  connectStripe,
  setPaymentDueDay,
} from "./actions";

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { connected } = await searchParams;
  const { membership } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, membership.schoolId),
  });

  // Al volver del onboarding, consulta el estado real en Stripe.
  let chargesEnabled = school?.stripeChargesEnabled ?? false;
  if (connected && school?.stripeAccountId && !chargesEnabled) {
    const status = await refreshConnectStatus(
      membership.schoolId,
      school.stripeAccountId
    );
    chargesEnabled = status.chargesEnabled;
  }
  const hasAccount = !!school?.stripeAccountId;

  const [plans, categories, students, charges] = await Promise.all([
    tdb.plans.findMany({
      with: { category: true },
      orderBy: [asc(plansTable.kind), asc(plansTable.name)],
    }),
    tdb.categories.findMany({ orderBy: [asc(categoriesTable.name)] }),
    tdb.students.findMany({
      where: eq(studentsTable.status, "active"),
      orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
      columns: { id: true, firstName: true, lastName: true },
    }),
    tdb.charges.findMany({
      with: { student: true },
      orderBy: [desc(chargesTable.createdAt)],
      limit: 200,
    }),
  ]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const studentOptions = students.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}`,
  }));
  const pending = charges.filter((c) => c.status === "pending");
  const pendingSum = pending.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Pagos"
        title="Pagos"
        subtitle="Define planes, genera las cuotas del mes y registra los pagos."
      />

      {/* Estado de cobros en línea con Stripe Connect */}
      {chargesEnabled ? (
        <div className="mb-6 rounded-2xl border border-pitch/30 bg-pitch/[0.06] p-4">
          <p className="text-sm font-semibold text-ink">
            Cobros en línea activos ✓
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Los papás ya pueden pagar con tarjeta; el dinero llega directo a la
            cuenta de tu escuela.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-tangerine/30 bg-tangerine/[0.07] p-4">
          <p className="text-sm font-semibold text-ink">Cobros en línea</p>
          <p className="mt-1 mb-3 text-sm text-ink-soft">
            {hasAccount
              ? "Falta terminar de configurar tu cuenta de Stripe para empezar a cobrar con tarjeta."
              : "Conecta tu cuenta de Stripe para que los papás paguen con tarjeta. Mientras tanto, puedes registrar pagos en efectivo abajo."}
          </p>
          <form action={connectStripe}>
            <button
              type="submit"
              className="rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
            >
              {hasAccount ? "Terminar configuración" : "Conectar pagos"}
            </button>
          </form>
        </div>
      )}

      {/* Día de vencimiento de las cuotas */}
      <form
        action={setPaymentDueDay}
        className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-sm"
      >
        <span className="text-ink-soft">Las cuotas vencen el día</span>
        <input
          type="number"
          name="dueDay"
          min={1}
          max={28}
          defaultValue={school?.paymentDueDay ?? ""}
          placeholder="—"
          className="w-16 rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
        <span className="text-ink-soft">de cada mes.</span>
        <button
          type="submit"
          className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
        >
          Guardar
        </button>
        <span className="text-xs text-ink-soft/80">
          (déjalo vacío para no usar vencimiento)
        </span>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nuevo plan</p>
          <CreatePlanForm categories={categoryOptions} />
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Generar cuotas</p>
          <p className="mb-3 text-xs text-ink-soft">
            Crea el cargo del mes a cada alumno con cuota mensual. Es seguro
            repetirlo: no duplica cargos.
          </p>
          <GenerateChargesForm currentPeriod={currentPeriod()} />
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Cobro único</p>
          <p className="mb-3 text-xs text-ink-soft">
            Inscripción, torneo o producto a un grupo de alumnos.
          </p>
          <CreateOneOffChargeForm
            categories={categoryOptions}
            students={studentOptions}
          />
        </Card>
      </div>

      {/* Planes */}
      <h2 className="mt-8 font-display text-lg font-bold">Planes</h2>
      {plans.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          Aún no tienes planes. Crea uno arriba.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {p.name}{" "}
                  <span className="ml-1 rounded-full bg-chalk-deep px-2 py-0.5 text-xs font-medium text-ink-soft">
                    {KIND_LABELS[p.kind as ChargeKind]}
                  </span>
                </p>
                <p className="text-xs text-ink-soft">
                  {formatMoney(p.amountCents, p.currency)}
                  {p.category ? ` · ${p.category.name}` : " · toda la escuela"}
                  {!p.active && " · inactivo"}
                </p>
              </div>
              <DeleteForm id={p.id} />
            </li>
          ))}
        </ul>
      )}

      {/* Cargos */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Cargos</h2>
        {pending.length > 0 && (
          <span className="text-sm text-ink-soft">
            {pending.length} pendiente{pending.length === 1 ? "" : "s"} ·{" "}
            {formatMoney(pendingSum)}
          </span>
        )}
      </div>
      {charges.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          No hay cargos todavía. Genera las cuotas del mes o crea un cobro único.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {charges.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {c.student.firstName} {c.student.lastName}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {c.description} · {formatMoney(c.amountCents, c.currency)}
                  {c.periodMonth ? ` · ${periodLabel(c.periodMonth)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status === "pending" && (
                  <>
                    <SmallForm action={markChargePaid} id={c.id} label="Marcar pagado" tone="pitch" />
                    <SmallForm action={cancelCharge} id={c.id} label="Cancelar" tone="muted" />
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

function DeleteForm({ id }: { id: string }) {
  return (
    <form action={deletePlan} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
      >
        Eliminar
      </button>
    </form>
  );
}

function SmallForm({
  action,
  id,
  label,
  tone,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
  tone: "pitch" | "muted";
}) {
  const cls =
    tone === "pitch"
      ? "bg-pitch text-chalk hover:bg-pitch-deep"
      : "border border-ink/15 text-ink-soft hover:text-ink";
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${cls}`}
      >
        {label}
      </button>
    </form>
  );
}
