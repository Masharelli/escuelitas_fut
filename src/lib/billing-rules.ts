const schoolDates = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const SCHOLARSHIP_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1), label: String(index + 1),
}));

export function billingDate(now = new Date()): string {
  return schoolDates.format(now);
}

function dateInMonth(period: string, day: number) {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function annualAnniversary(enrolledOn: string, year: number): string {
  return dateInMonth(`${year}-${enrolledOn.slice(5, 7)}`, Number(enrolledOn.slice(8)));
}

export type DiscountRow = { name: string; kind: string; value: number };

export function applyDiscount(amountCents: number, discount: DiscountRow): number {
  const result = discount.kind === "percent"
    ? Math.round((amountCents * (100 - discount.value)) / 100)
    : amountCents - discount.value;
  return Math.max(0, result);
}

export function monthlyQuote({
  baseAmountCents, discounts, period, today, schoolDay, scholarshipDay,
}: {
  baseAmountCents: number;
  discounts: DiscountRow[] | undefined;
  period: string;
  today: string;
  schoolDay: number | null;
  scholarshipDay: number | null;
}) {
  let amountCents = baseAmountCents;
  let scholarshipName: string | null = null;
  const scholarshipDeadline = discounts?.length && scholarshipDay
    ? dateInMonth(period, scholarshipDay)
    : null;
  const dueDate = scholarshipDeadline ?? (schoolDay ? dateInMonth(period, schoolDay) : null);
  for (const discount of discounts ?? []) {
    const discounted = applyDiscount(baseAmountCents, discount);
    if (discounted >= amountCents || (discounted > 0 && scholarshipDeadline && today > scholarshipDeadline)) continue;
    amountCents = discounted;
    scholarshipName = discount.name;
  }
  return { amountCents, scholarshipName, dueDate, status: amountCents === 0 ? "paid" as const : "pending" as const };
}
