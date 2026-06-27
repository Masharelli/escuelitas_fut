import Link from "next/link";

import { designateScorekeeper } from "@/app/admin/partidos/actions";

type Candidate = { id: string; name: string | null; email: string | null };

/**
 * Designa al "papá estadístico" de un partido (un tutor del equipo) y enlaza a
 * la pantalla de captura en vivo. Server component: el select postea la acción.
 */
export function ScorekeeperForm({
  matchId,
  current,
  candidates,
}: {
  matchId: string;
  current: string | null;
  candidates: Candidate[];
}) {
  return (
    <div className="space-y-3">
      {candidates.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aún no hay tutores vinculados a este equipo para designar.
        </p>
      ) : (
        <form action={designateScorekeeper} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="matchId" value={matchId} />
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Papá estadístico
            </span>
            <select
              name="scorekeeperUserId"
              defaultValue={current ?? ""}
              className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
            >
              <option value="">Sin asignar</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.email ?? "Tutor"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-chalk-deep"
          >
            Guardar
          </button>
        </form>
      )}

      <Link
        href={`/estadistico/${matchId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-pitch hover:underline"
      >
        Abrir captura en vivo →
      </Link>
    </div>
  );
}
