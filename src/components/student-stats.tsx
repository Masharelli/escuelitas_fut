import { Card } from "@/components/ui";
import type { StudentStats } from "@/lib/stats";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/60 px-3 py-2.5 text-center">
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
    </div>
  );
}

/** Tarjeta de estadísticas del alumno (partidos + asistencia). */
export function StudentStats({ stats }: { stats: StudentStats }) {
  return (
    <Card>
      <p className="mb-3 text-sm font-semibold text-ink">Estadísticas</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label="Partidos" value={stats.matchesPlayed} />
        <Stat label="Goles" value={stats.goals} />
        <Stat label="Asistencias" value={stats.assists} />
        <Stat label="Minutos" value={stats.minutesPlayed} />
        <Stat label="🟨 Amarillas" value={stats.yellowCards} />
        <Stat label="🟥 Rojas" value={stats.redCards} />
        <Stat
          label="Asist. entrenos"
          value={`${stats.sessionsPresent}/${stats.sessionsTotal}`}
        />
        <Stat label="% asistencia" value={`${stats.attendanceRate}%`} />
      </div>
    </Card>
  );
}
