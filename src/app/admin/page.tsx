import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { getActiveMembership } from "@/lib/tenant";
import { PrimaryLink } from "@/components/ui";

export default async function AdminHomePage() {
  const { membership, session } = await getActiveMembership();
  const schoolId = membership.schoolId;
  const firstName = session.user.name?.split(" ")[0] ?? "";

  const [studentCount, teamCount] = await Promise.all([
    db
      .select({ value: count() })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .then((r) => r[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(teams)
      .where(eq(teams.schoolId, schoolId))
      .then((r) => r[0]?.value ?? 0),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-medium text-pitch">Panel de administración</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
        Hola{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-ink-soft">
        Estás administrando{" "}
        <span className="font-semibold text-ink">{membership.school.name}</span>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<StudentsIcon />}
          label="Alumnos"
          value={String(studentCount)}
          href="/admin/alumnos"
        />
        <StatCard
          icon={<TeamsIcon />}
          label="Equipos"
          value={String(teamCount)}
          href="/admin/equipos"
        />
        <StatCard
          icon={<PaymentsIcon />}
          label="Pagos del mes"
          value="—"
          hint="Disponible en la Fase 3"
        />
        <StatCard
          icon={<MatchesIcon />}
          label="Próximos partidos"
          value="—"
          hint="Disponible en la Fase 4"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-pitch/20 bg-pitch/[0.06] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pitch">
          Siguiente paso
        </p>
        <h2 className="mt-2 font-display text-xl font-bold">
          {studentCount === 0
            ? "Registra tu primer equipo y tus alumnos"
            : "Sigue construyendo tu escuela"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Crea categorías y equipos, y da de alta a tus alumnos con su tutor. Más
          adelante llegarán los pagos, los partidos y las notificaciones.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <PrimaryLink href="/admin/alumnos/nuevo">Registrar alumno</PrimaryLink>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pitch/10 text-pitch">
        {icon}
      </div>
      <p className="mt-3 text-sm text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-3xl font-extrabold tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-soft/80">{hint}</p>}
    </>
  );

  const base =
    "rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm transition";

  if (href) {
    return (
      <Link href={href} className={`${base} block hover:border-pitch/30 hover:shadow`}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function StudentsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17.5 19c0-2.2-1-3.8-2.5-4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 5 5.5V11c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V5.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 14.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MatchesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4l4-2.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
