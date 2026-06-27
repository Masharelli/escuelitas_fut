import Link from "next/link";

import { requireRole } from "@/lib/tenant";
import { getCoachTeams } from "@/lib/coach";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function CoachHomePage() {
  const { session, membership } = await requireRole(["coach"]);
  const teams = await getCoachTeams(session.user.id, membership.schoolId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Entrenador"
        title="Mis equipos"
        subtitle="Gestiona asistencias, convocatorias y partidos de tus equipos."
      />

      {teams.length === 0 ? (
        <EmptyState
          title="Aún no tienes equipos asignados"
          description="Cuando la escuela te asigne un equipo, aparecerá aquí."
        />
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`/coach/equipos/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/80 px-5 py-4 shadow-sm transition hover:border-pitch/30 hover:shadow"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: t.color || "var(--color-pitch)" }}
                  />
                  <span className="font-semibold text-ink">{t.name}</span>
                  {t.category && (
                    <span className="text-sm text-ink-soft">
                      · {t.category.name}
                    </span>
                  )}
                </span>
                <span className="text-ink-soft">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
