import Link from "next/link";
import Image from "next/image";

import { Card } from "@/components/ui";
import { deleteStudent } from "@/app/admin/alumnos/actions";

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  category?: { name: string } | null;
  team?: { name: string } | null;
};

/** Lista de alumnos en tarjeta, reutilizable (alumnos, equipo, categoría…). */
export function StudentList({
  students,
  showBadges = true,
}: {
  students: StudentRow[];
  showBadges?: boolean;
}) {
  return (
    <Card className="p-0 sm:p-0">
      <ul className="divide-y divide-ink/10">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
            <Avatar name={s.firstName} photoUrl={s.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {s.firstName} {s.lastName}
              </p>
              {showBadges && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {s.category && <Badge>{s.category.name}</Badge>}
                  {s.team && <Badge>{s.team.name}</Badge>}
                  {!s.category && !s.team && (
                    <span className="text-xs text-ink-soft">Sin asignar</span>
                  )}
                </div>
              )}
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
