import Link from "next/link";

import { requireRole } from "@/lib/tenant";
import { getCoachTeams } from "@/lib/coach";
import { PageHeader, EmptyState } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";

export default async function CoachHomePage() {
  const { session, membership } = await requireRole(["coach"]);
  const teams = await getCoachTeams(session.user.id, membership.schoolId);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Mis equipos"
        subtitle="Gestiona asistencias, convocatorias y partidos de tus equipos."
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={<PortalIcon icon="teams" />}
          title="Aún no tienes equipos asignados"
          description="Cuando la escuela te asigne un equipo, aparecerá aquí."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {teams.map((t) => (
            <li key={t.id} className="min-w-0">
              <Link
                href={`/coach/equipos/${t.id}`}
                className="flex h-full min-w-0 items-center gap-4 rounded-3xl border border-outline-variant bg-surface p-4 transition-colors hover:bg-surface-container sm:p-5"
              >
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                  <PortalIcon icon="teams" />
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-surface"
                    style={{ backgroundColor: t.color || "var(--color-pitch)" }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold leading-tight">{t.name}</span>
                  {t.category && (
                    <span className="mt-1 block text-sm text-ink-soft">
                      {t.category.name}
                    </span>
                  )}
                </span>
                <span aria-hidden="true" className="shrink-0 text-pitch">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
