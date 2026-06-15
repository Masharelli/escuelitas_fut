import Link from "next/link";
import { notFound } from "next/navigation";

import { getActiveMembership } from "@/lib/tenant";
import { getMyChild } from "@/lib/guardians";
import { PageHeader } from "@/components/ui";
import { StudentDetail } from "@/components/student-detail";

export default async function HijoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await getActiveMembership();

  const child = await getMyChild(session.user.id, id);
  if (!child) notFound();

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
    </div>
  );
}
