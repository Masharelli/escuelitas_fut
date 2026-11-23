import { asc, eq } from "drizzle-orm";

import { discounts as discountsTable, students as studentsTable } from "@/db/schema";
import { requireRole, OWNER_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { formatMoney } from "@/lib/billing";
import { Card, PageHeader } from "@/components/ui";
import { CreateDiscountForm } from "../pagos/forms";
import { assignDiscount, deleteDiscount, unassignDiscount } from "../pagos/actions";

export default async function BecasPage() {
  const { membership } = await requireRole(OWNER_ROLES);
  const tdb = tenantDb(membership.schoolId);
  const [discounts, students] = await Promise.all([
    tdb.discounts.findMany({
      with: { students: { with: { student: { columns: { id: true, firstName: true, lastName: true } } } } },
      orderBy: [asc(discountsTable.name)],
    }),
    tdb.students.findMany({
      where: eq(studentsTable.status, "active"),
      orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
      columns: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const studentOptions = students.map((student) => ({
    value: student.id, label: `${student.firstName} ${student.lastName}`,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Becas"
        subtitle="Crea becas y asígnalas a uno o varios alumnos. Si hay varias, se aplica la que más reduce la mensualidad."
      />
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Nueva beca/promoción</p>
          <CreateDiscountForm />
        </Card>
        <div className="space-y-3 lg:col-span-2">
          {discounts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Aún no tienes becas ni promociones.
            </p>
          ) : (
            discounts.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold text-ink">
                    {d.name}{" "}
                    <span className="ml-1 rounded-full bg-pitch/10 px-2 py-0.5 text-xs font-medium text-pitch">
                      {d.kind === "percent"
                        ? `-${d.value}%`
                        : `-${formatMoney(d.value)}`}
                    </span>
                  </p>
                  <form action={deleteDiscount} className="shrink-0">
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>

                <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-pitch">Modificar beca/promoción</summary><div className="mt-3"><CreateDiscountForm discount={d} /></div></details>

                {d.students.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {d.students.map((sd) => (
                      <li
                        key={sd.id}
                        className="inline-flex items-center gap-1 rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs text-ink-soft"
                      >
                        {sd.student.firstName} {sd.student.lastName}
                        <form action={unassignDiscount}>
                          <input type="hidden" name="id" value={sd.id} />
                          <button
                            type="submit"
                            aria-label={`Quitar a ${sd.student.firstName}`}
                            className="ml-0.5 font-semibold text-ink-soft transition hover:text-red-600"
                          >
                            ×
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  action={assignDiscount}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="discountId" value={d.id} />
                  <label className="min-w-0 flex-1 text-xs text-ink-soft">
                    <span className="mb-1 block">
                      Asignar alumnos (Ctrl/Cmd para varios)
                    </span>
                    <select
                      name="studentIds"
                      multiple
                      size={4}
                      className="w-full rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-sm text-ink shadow-sm"
                    >
                      {studentOptions
                        .filter(
                          (o) => !d.students.some((sd) => sd.student.id === o.value)
                        )
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-pitch px-4 py-2 text-xs font-semibold text-chalk transition hover:bg-pitch-deep"
                  >
                    Asignar
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
