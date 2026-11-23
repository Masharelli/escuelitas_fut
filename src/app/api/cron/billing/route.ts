import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { schools } from "@/db/schema";
import { billingDate } from "@/lib/billing-rules";
import { generateAnnualRenewals, generateMonthlyCharges } from "@/lib/recurring-billing";
import { chargeAutopayForPeriod } from "@/lib/stripe";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || header.length !== expected.length || !timingSafeEqual(header, expected)) {
    return new Response("No autorizado", { status: 401 });
  }

  const today = billingDate();
  const period = today.slice(0, 7);
  const academies = await db.select({ id: schools.id }).from(schools).where(eq(schools.kind, "academy"));
  let monthly = 0;
  let renewals = 0;
  let failures = 0;
  for (const school of academies) {
    try {
      monthly += await generateMonthlyCharges(school.id, period, today);
      renewals += await generateAnnualRenewals(school.id, today);
      await chargeAutopayForPeriod(school.id, period);
    } catch (error) {
      failures += 1;
      console.error("Error al procesar cobros de la escuela", school.id, error instanceof Error ? error.name : typeof error);
    }
  }
  return Response.json({ monthly, renewals, failures }, { status: failures ? 500 : 200 });
}
