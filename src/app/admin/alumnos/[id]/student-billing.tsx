import { and, asc, desc, eq } from "drizzle-orm";

import { charges, discounts, studentDiscounts } from "@/db/schema";
import { tenantDb } from "@/lib/tenant-db";
import { CHARGE_STATUS_LABELS, formatDueDate, formatMoney, isManualPayment, scholarshipLabel } from "@/lib/billing";
import { SCHOLARSHIP_DAY_OPTIONS } from "@/lib/billing-rules";
import { Card, SecondaryLink } from "@/components/ui";
import { SelectField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";
import { markChargePaid, undoManualPayment } from "../../finanzas/actions";
import { assignDiscount, unassignDiscount } from "../../pagos/actions";
import { setScholarshipPaymentDay } from "../actions";

export async function StudentBilling({
  schoolId, studentId, canManageScholarships, scholarshipPaymentDay, schoolPaymentDay,
}: {
  schoolId: string;
  studentId: string;
  canManageScholarships: boolean;
  scholarshipPaymentDay: number | null;
  schoolPaymentDay: number | null;
}) {
  const tdb = tenantDb(schoolId);
  const [assigned, available, recentCharges] = await Promise.all([
    tdb.studentDiscounts.findMany({
      where: eq(studentDiscounts.studentId, studentId), with: { discount: true },
    }),
    canManageScholarships ? tdb.discounts.findMany({
      where: and(eq(discounts.active, true)), orderBy: [asc(discounts.name)],
    }) : [],
    tdb.charges.findMany({
      where: eq(charges.studentId, studentId),
      orderBy: [desc(charges.createdAt), desc(charges.id)],
      limit: 12,
    }),
  ]);
  const scholarships = assigned.filter((row) => row.discount.active && row.discount.schoolId === schoolId);
  const options = available.filter((discount) => !scholarships.some((row) => row.discountId === discount.id));
  const dueDay = scholarshipPaymentDay ?? schoolPaymentDay;
  const back = `/admin/alumnos/${studentId}`;

  return (
    <div className="mt-5 space-y-4">
      <Card>
        <h2 className="font-display text-lg font-bold">Becas</h2>
        {scholarships.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Sin beca asignada.</p>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {scholarships.map(({ id, discount }) => (
                <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-pitch/10 px-3 py-1 font-medium text-pitch">
                    {scholarshipLabel(discount)}
                  </span>
                  {canManageScholarships && (
                    <form action={unassignDiscount}>
                      <input type="hidden" name="id" value={id} />
                      <button className="rounded-full px-2 py-1 text-xs text-ink-soft hover:text-red-600"
                        aria-label={`Quitar ${discount.name}`}>Quitar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">
              {dueDay ? `Las becas parciales aplican hasta el día ${dueDay} de cada mes.` : "Sin fecha límite para pagar con beca."}
            </p>
          </>
        )}
        {canManageScholarships && (
          <div className="mt-4 space-y-3">
            {options.length > 0 && (
              <form action={assignDiscount} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="studentIds" value={studentId} />
                <SelectField name="discountId" label="Agregar beca" required options={options.map((discount) => ({
                  value: discount.id, label: scholarshipLabel(discount),
                }))} />
                <SubmitButton>Asignar</SubmitButton>
              </form>
            )}
            {scholarships.length > 0 && (
              <form action={setScholarshipPaymentDay} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="studentId" value={studentId} />
                <SelectField
                  label="Último día de pago con beca"
                  name="scholarshipPaymentDay"
                  options={SCHOLARSHIP_DAY_OPTIONS}
                  defaultValue={scholarshipPaymentDay?.toString()}
                  placeholder="Usar el vencimiento general"
                />
                <SubmitButton>Guardar día</SubmitButton>
              </form>
            )}
            {available.length === 0 && <SecondaryLink href="/admin/becas">Crear beca</SecondaryLink>}
          </div>
        )}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Pagos recientes</h2>
          <SecondaryLink href={canManageScholarships ? `/admin/finanzas/${studentId}` : `/admin/pagos?alumno=${studentId}`}>
            Ver todos
          </SecondaryLink>
        </div>
        {recentCharges.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Este alumno aún no tiene cargos.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {recentCharges.map((charge) => {
              const canMark = charge.status === "pending" && !charge.stripePaymentIntentId;
              const canUndo = isManualPayment(charge);
              return (
                <li key={charge.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{charge.description}</p>
                    <p className="text-xs text-ink-soft">
                      {formatMoney(charge.amountCents, charge.currency)}
                      {charge.dueDate && charge.status === "pending" && ` · Vence el ${formatDueDate(charge.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {charge.amountCents === 0 && charge.scholarshipName ? "Cubierto por beca"
                        : charge.status === "pending" ? "No pagado" : CHARGE_STATUS_LABELS[charge.status]}
                    </span>
                    {(canMark || canUndo) && (
                      <form action={canMark ? markChargePaid : undoManualPayment}>
                        <input type="hidden" name="id" value={charge.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton>{canMark ? "Marcar pagado" : "Deshacer pago"}</SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
