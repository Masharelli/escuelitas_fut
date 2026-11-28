import Link from "next/link";
import { and, count, eq, gte } from "drizzle-orm";

import { PortalIcon, type NavIcon } from "@/components/portal/portal-icon";
import { AddButtonLabel, PrimaryLink } from "@/components/ui";
import { db } from "@/db";
import { leagueTeams, matches, seasons, students, teams } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

type DashboardLink = { icon: NavIcon; label: string; href: string };

export default async function AdminHomePage() {
  const { membership, session } = await requireRole(ADMIN_ROLES);
  const tdb = tenantDb(membership.schoolId);
  const firstName = session.user.name?.trim().split(/\s+/)[0];
  const title = firstName ? `Hola, ${firstName}` : "Inicio";

  if (membership.school.kind === "league") {
    const [[leagueTeamCount], [seasonCount]] = await Promise.all([
      db.select({ value: count() }).from(leagueTeams).where(tdb.leagueTeams.scope()),
      db.select({ value: count() }).from(seasons).where(tdb.seasons.scope()),
    ]);

    return (
      <Dashboard
        title={title}
        schoolName={membership.school.name}
        action={{ href: "/admin/liga/temporadas", label: "Ver temporadas" }}
        stats={[
          { icon: "teams", label: "Equipos", href: "/admin/liga/equipos", value: leagueTeamCount.value },
          { icon: "trophy", label: "Temporadas", href: "/admin/liga/temporadas", value: seasonCount.value },
        ]}
      />
    );
  }

  const [[studentCount], [teamCount], [upcomingCount]] = await Promise.all([
    db.select({ value: count() }).from(students).where(tdb.students.scope()),
    db.select({ value: count() }).from(teams).where(tdb.teams.scope()),
    db.select({ value: count() }).from(matches).where(tdb.matches.scope(and(
      eq(matches.status, "scheduled"),
      gte(matches.kickoffAt, new Date()),
    ))),
  ]);

  return (
    <Dashboard
      title={title}
      schoolName={membership.school.name}
      action={{ href: "/admin/alumnos/nuevo", label: "Registrar alumno", add: true }}
      stats={[
        { icon: "students", label: "Alumnos", href: "/admin/alumnos", value: studentCount.value },
        { icon: "teams", label: "Equipos", href: "/admin/equipos", value: teamCount.value },
        { icon: "matches", label: "Próximos partidos", href: "/admin/partidos", value: upcomingCount.value },
      ]}
      shortcuts={[
        { icon: "payments", label: "Revisar pagos", href: "/admin/pagos" },
        { icon: "calendar", label: "Abrir calendario", href: "/admin/calendario" },
        { icon: "attendance", label: "Programar entrenamiento", href: "/admin/asistencias#programar-entrenamiento" },
      ]}
    />
  );
}

function Dashboard({
  title,
  schoolName,
  action,
  stats,
  shortcuts,
}: {
  title: string;
  schoolName: string;
  action: { href: string; label: string; add?: boolean };
  stats: (DashboardLink & { value: number })[];
  shortcuts?: DashboardLink[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="pitch-panel rounded-[1.75rem] bg-primary-container px-5 py-7 text-on-primary-container sm:px-8 sm:py-9">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{schoolName}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {title}
            </h1>
          </div>
          <div className="min-w-0 sm:shrink-0">
            <PrimaryLink href={action.href}>
              {action.add ? <AddButtonLabel>{action.label}</AddButtonLabel> : <>{action.label} <span aria-hidden="true">→</span></>}
            </PrimaryLink>
          </div>
        </div>
      </header>

      <section aria-labelledby="school-summary" className="mt-7">
        <h2 id="school-summary" className="mb-3 font-display text-xl font-bold">Resumen</h2>
        <ul className={`grid gap-3 sm:grid-cols-2 ${stats.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {stats.map(({ icon, label, href, value }) => (
            <li key={href} className="min-w-0">
              <Link href={href} className="flex h-full min-w-0 items-center gap-4 rounded-3xl border border-outline-variant bg-surface p-4 transition-colors hover:bg-surface-container lg:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                  <PortalIcon icon={icon} size={23} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-soft">{label}</span>
                  <span className="mt-1 block font-display text-3xl leading-none font-extrabold tabular-nums">{value}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-pitch">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {shortcuts && (
        <section aria-labelledby="admin-shortcuts" className="mt-7">
          <h2 id="admin-shortcuts" className="mb-3 font-display text-xl font-bold">Accesos rápidos</h2>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map(({ href, icon, label }) => (
              <li key={href} className="min-w-0">
                <Link href={href} className="flex h-full min-h-14 items-center gap-3 rounded-2xl bg-surface-container px-4 py-3 text-sm font-semibold transition-colors hover:bg-chalk-deep">
                  <span className="text-pitch"><PortalIcon icon={icon} size={21} /></span>
                  <span className="min-w-0 flex-1">{label}</span>
                  <span aria-hidden="true" className="shrink-0 text-pitch">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
