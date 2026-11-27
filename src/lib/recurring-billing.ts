import { and, asc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { charges, plans, schools, students } from "@/db/schema";
import { activeDiscountsByStudent, notifyChargesCreated, periodLabel } from "@/lib/billing";
import { annualAnniversary, billingDate, monthlyQuote, type DiscountRow } from "@/lib/billing-rules";
import { tenantDb } from "@/lib/tenant-db";

type BillingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Charge = typeof charges.$inferSelect;
type Plan = typeof plans.$inferSelect;

function selectPlan(available: Plan[], categoryId: string | null) {
  return available.find((plan) => plan.categoryId === categoryId)
    ?? available.find((plan) => plan.categoryId === null);
}

function monthlyDescription(description: string, scholarshipName: string | null) {
  return scholarshipName ? `${description} (${scholarshipName})` : description;
}

function monthlyAdjustment(
  charge: Charge,
  today: string,
  discounts: DiscountRow[] | undefined,
  schoolDay: number | null,
  scholarshipDay: number | null,
  plan: Plan | null,
) {
  const period = charge.periodMonth;
  if (!period || charge.paidAt || charge.stripePaymentIntentId || !["pending", "paid"].includes(charge.status)) return;
  const suffix = charge.scholarshipName ? ` (${charge.scholarshipName})` : "";
  const legacyLabel = plan ? `${plan.name} · ${periodLabel(period)}` : null;
  const legacyDiscount = charge.baseAmountCents === null && plan && legacyLabel
    && charge.description.startsWith(`${legacyLabel} (`);
  const baseAmountCents = charge.baseAmountCents ?? (legacyDiscount ? plan.amountCents : charge.amountCents);
  const description = legacyDiscount && legacyLabel
    ? legacyLabel
    : suffix && charge.description.endsWith(suffix)
      ? charge.description.slice(0, -suffix.length)
      : charge.description;

  let quote;
  if (period < today.slice(0, 7)) {
    if (!scholarshipDay || charge.status !== "pending" || !charge.scholarshipName || !charge.dueDate || charge.dueDate >= today) return;
    quote = { amountCents: baseAmountCents, scholarshipName: null, dueDate: charge.dueDate, status: "pending" as const };
  } else {
    quote = monthlyQuote({ baseAmountCents, discounts, period, today, schoolDay, scholarshipDay });
  }

  const nextDescription = monthlyDescription(description, quote.scholarshipName);
  if (charge.amountCents === quote.amountCents && charge.description === nextDescription
    && charge.dueDate === quote.dueDate && charge.baseAmountCents === baseAmountCents
    && charge.scholarshipName === quote.scholarshipName && charge.status === quote.status) return;
  return { ...quote, baseAmountCents, description: nextDescription };
}

async function updateMonthlyCharge(
  tx: BillingTx,
  charge: Charge,
  adjustment: NonNullable<ReturnType<typeof monthlyAdjustment>>,
  stripeAccountId: string | null,
) {
  let checkoutId = charge.stripeCheckoutId;
  if (checkoutId && charge.amountCents !== adjustment.amountCents) {
    const { expireUnpaidCheckout } = await import("@/lib/stripe");
    if (!(await expireUnpaidCheckout(stripeAccountId, checkoutId))) return;
    checkoutId = null;
  }

  await tx.update(charges).set({
    ...adjustment, stripeCheckoutId: checkoutId,
  }).where(eq(charges.id, charge.id));
}

export async function generateMonthlyCharges(
  schoolId: string,
  period: string,
  today = billingDate(),
  studentId?: string,
  create = true,
): Promise<number> {
  const tdb = tenantDb(schoolId);
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, schoolId),
    columns: { paymentDueDay: true, stripeAccountId: true },
  });
  if (!school) return 0;

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${schoolId}, 0))`);
    const [monthlyPlans, targets, discountRows, rows] = await Promise.all([
      create ? tx.query.plans.findMany({
        where: tdb.plans.scope(and(eq(plans.kind, "monthly"), eq(plans.active, true))),
        orderBy: [asc(plans.createdAt), asc(plans.id)],
      }) : [],
      tx.query.students.findMany({
        where: tdb.students.scope(studentId ? eq(students.id, studentId) : undefined),
        columns: { id: true, categoryId: true, enrolledOn: true, status: true, scholarshipPaymentDay: true },
      }),
      activeDiscountsByStudent(schoolId, studentId, tx),
      tx.query.charges.findMany({
        where: tdb.charges.scope(and(
          eq(charges.kind, "monthly"), studentId ? eq(charges.studentId, studentId) : undefined,
          or(eq(charges.periodMonth, period), !create ? gte(charges.periodMonth, today.slice(0, 7)) : undefined, and(
            lt(charges.periodMonth, today.slice(0, 7)), lt(charges.dueDate, today),
            eq(charges.status, "pending"), isNotNull(charges.scholarshipName),
          )),
        )),
        with: { plan: true },
      }),
    ]);

    const targetsById = new Map(targets.map((student) => [student.id, student]));
    const billed = new Set(rows.filter((row) => row.periodMonth === period).map((row) => row.studentId));
    for (const row of rows) {
      const discount = discountRows.get(row.studentId);
      const day = targetsById.get(row.studentId)?.scholarshipPaymentDay ?? null;
      const plan = row.plan?.schoolId === schoolId ? row.plan : null;
      if (!monthlyAdjustment(row, today, discount, school.paymentDueDay, day, plan)) continue;
      const [locked] = await tx.select().from(charges).where(eq(charges.id, row.id)).for("update");
      if (!locked) continue;
      const adjustment = monthlyAdjustment(locked, today, discount, school.paymentDueDay, day, plan);
      if (adjustment) await updateMonthlyCharge(tx, locked, adjustment, school.stripeAccountId);
    }

    if (!create) return [];
    const pending: (typeof charges.$inferInsert)[] = [];
    for (const student of targets) {
      if (student.status !== "active" || billed.has(student.id) || (student.enrolledOn && student.enrolledOn.slice(0, 7) > period)) continue;
      const plan = selectPlan(monthlyPlans, student.categoryId);
      if (!plan) continue;
      const quote = monthlyQuote({
        baseAmountCents: plan.amountCents, discounts: discountRows.get(student.id), period, today,
        schoolDay: school.paymentDueDay, scholarshipDay: student.scholarshipPaymentDay,
      });
      pending.push({
        schoolId, studentId: student.id, planId: plan.id, kind: "monthly", periodMonth: period,
        currency: plan.currency, baseAmountCents: plan.amountCents, ...quote,
        description: monthlyDescription(`${plan.name} · ${periodLabel(period)}`, quote.scholarshipName),
      });
    }
    return pending.length ? tx.insert(charges).values(pending).onConflictDoNothing().returning() : [];
  });

  await notifyChargesCreated(schoolId, created.filter((charge) => charge.status === "pending"));
  return created.length;
}

export async function generateAnnualRenewals(schoolId: string, today = billingDate()) {
  const tdb = tenantDb(schoolId);
  const year = Number(today.slice(0, 4));
  const annualPlans = await tdb.plans.findMany({
    where: and(eq(plans.kind, "enrollment"), eq(plans.active, true), lte(plans.annualRenewalStartsOn, today)),
    orderBy: [asc(plans.createdAt), asc(plans.id)],
  });
  if (!annualPlans.length) return 0;
  const [targets, existing] = await Promise.all([
    tdb.students.findMany({ where: and(eq(students.status, "active"), isNotNull(students.enrolledOn)) }),
    tdb.charges.findMany({
      where: and(eq(charges.kind, "enrollment"), or(
        eq(charges.renewalYear, year),
        and(isNull(charges.renewalYear), sql`${charges.createdAt} >= ${`${year}-01-01`}::date`),
      )),
      columns: { studentId: true, renewalYear: true, status: true, createdAt: true },
    }),
  ]);
  const billed = new Set(existing.filter((row) => row.renewalYear === year).map((row) => row.studentId));
  const manualByStudent = new Map<string, string>();
  for (const row of existing) {
    if (row.renewalYear !== null || ["canceled", "refunded"].includes(row.status)) continue;
    const created = billingDate(row.createdAt);
    if (created > (manualByStudent.get(row.studentId) ?? "")) manualByStudent.set(row.studentId, created);
  }

  const renewals = targets.flatMap((student) => {
    if (!student.enrolledOn || Number(student.enrolledOn.slice(0, 4)) >= year || billed.has(student.id)) return [];
    const plan = selectPlan(annualPlans, student.categoryId);
    if (!plan?.annualRenewalStartsOn) return [];
    const dueDate = annualAnniversary(student.enrolledOn, year);
    if (dueDate > today || dueDate < plan.annualRenewalStartsOn) return [];
    if ((manualByStudent.get(student.id) ?? "") >= dueDate || (student.reenrolledOn ?? "") >= dueDate) return [];
    return [{
      studentId: student.id, planId: plan.id, kind: "enrollment" as const, renewalYear: year,
      amountCents: plan.amountCents, currency: plan.currency, description: `${plan.name} · ${year}`, dueDate,
    }];
  });

  const created = await tdb.charges.insertManyIgnoringDuplicates(renewals);
  await notifyChargesCreated(schoolId, created);
  return created.length;
}
