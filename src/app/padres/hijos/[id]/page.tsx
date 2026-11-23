import Link from "next/link";
import { notFound } from "next/navigation";

import { getGuardianMembership, getMyChild } from "@/lib/guardians";
import { Card, PageHeader } from "@/components/ui";
import { StudentDetail } from "@/components/student-detail";
import { StudentStats } from "@/components/student-stats";
import { getStudentStats } from "@/lib/stats";
import { hasFeature } from "@/lib/plan";
import { activeDiscountsByStudent, scholarshipLabel } from "@/lib/billing";

export default async function HijoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await getGuardianMembership();

  const child = await getMyChild(session.user.id, id);
  if (!child) notFound();
  const [stats, discounts] = await Promise.all([
    child.tenant && hasFeature(child.tenant.plan, "stats") ? getStudentStats(child.schoolId, child.id) : null,
    activeDiscountsByStudent(child.schoolId, child.id),
  ]);
  const scholarships = discounts.get(child.id) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/padres/hijos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mis hijos
      </Link>

      <PageHeader
        eyebrow={child.tenant?.name ?? "Mi hijo"}
        title={`${child.firstName} ${child.lastName}`}
      />

      <StudentDetail student={child} showGuardian={false} />
      {scholarships.length > 0 && (
        <Card className="mt-5">
          <h2 className="font-display text-lg font-bold">Becas</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {scholarships.map((discount, index) => <li key={index}>{scholarshipLabel(discount)}</li>)}
          </ul>
        </Card>
      )}
      {stats && <div className="mt-5"><StudentStats stats={stats} /></div>}
    </div>
  );
}
