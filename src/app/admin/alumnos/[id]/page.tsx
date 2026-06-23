import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { students as studentsTable } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { getStudentInvitations, getLinkedGuardians } from "@/lib/invitations";
import { PageHeader, SecondaryLink } from "@/components/ui";
import { StudentDetail } from "@/components/student-detail";
import { GuardianInvite } from "../guardian-invite";

export default async function AlumnoFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);

  const student = await tenantDb(membership.schoolId).students.findFirst({
    where: eq(studentsTable.id, id),
    with: { category: true, team: true },
  });
  if (!student) notFound();

  const [invitations, linked] = await Promise.all([
    getStudentInvitations(id),
    getLinkedGuardians(id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Alumno"
        title={`${student.firstName} ${student.lastName}`}
        action={
          <SecondaryLink href={`/admin/alumnos/${student.id}/editar`}>
            Editar
          </SecondaryLink>
        }
      />

      <div className="mb-5">
        <GuardianInvite
          studentId={student.id}
          guardianEmail={student.guardianEmail}
          invitations={invitations.map((i) => ({
            id: i.id,
            token: i.token,
            email: i.email,
            status: i.status,
            acceptedByName: i.acceptedBy?.name ?? null,
          }))}
          linkedGuardians={linked.map((u) => ({
            name: u.name,
            email: u.email,
          }))}
        />
      </div>

      <StudentDetail student={student} />
    </div>
  );
}
