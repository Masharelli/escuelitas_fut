import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PageHeader, EmptyState, PrimaryLink, Card } from "@/components/ui";
import { deleteStudent } from "./actions";

export default async function AlumnosPage() {
  const { membership } = await getActiveMembership();

  const students = await db.query.students.findMany({
    where: eq(studentsTable.schoolId, membership.schoolId),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Alumnos"
        title="Alumnos"
        subtitle={
          students.length
            ? `${students.length} alumno${students.length === 1 ? "" : "s"} registrado${students.length === 1 ? "" : "s"}.`
            : "Registra a los alumnos de tu escuela."
        }
        action={
          students.length > 0 ? (
            <PrimaryLink href="/admin/alumnos/nuevo">
              <PlusIcon /> Nuevo alumno
            </PrimaryLink>
          ) : undefined
        }
      />

      {students.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Aún no hay alumnos"
          description="Da de alta a tu primer alumno con sus datos, categoría y la información de su tutor."
          action={
            <PrimaryLink href="/admin/alumnos/nuevo">
              <PlusIcon /> Registrar alumno
            </PrimaryLink>
          }
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-ink/10">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 p-4 sm:gap-4"
              >
                <Avatar
                  name={s.firstName}
                  photoUrl={s.photoUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {s.firstName} {s.lastName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {s.category && <Badge>{s.category.name}</Badge>}
                    {s.team && <Badge>{s.team.name}</Badge>}
                    {!s.category && !s.team && (
                      <span className="text-xs text-ink-soft">Sin asignar</span>
                    )}
                  </div>
                </div>
                {s.guardianName && (
                  <div className="hidden text-right text-sm text-ink-soft sm:block">
                    <p className="text-ink">{s.guardianName}</p>
                    {s.guardianPhone && <p className="text-xs">{s.guardianPhone}</p>}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/alumnos/${s.id}/editar`}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-pitch transition hover:bg-pitch/10"
                  >
                    Editar
                  </Link>
                  <form action={deleteStudent}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      aria-label={`Eliminar a ${s.firstName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 rounded-full border border-ink/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pitch/10 font-semibold text-pitch">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
