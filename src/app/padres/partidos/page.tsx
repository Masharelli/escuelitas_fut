import { getActiveMembership } from "@/lib/tenant";
import {
  getMyChildrenMatches,
  getMyChildrenTournaments,
} from "@/lib/guardians";
import { getMyChildrenCallups, type RsvpStatus } from "@/lib/callups";
import { RsvpButtons } from "@/components/rsvp-buttons";
import {
  formatKickoff,
  scoreLabel,
  resultOf,
  TOURNAMENT_FORMAT_LABELS,
  MATCH_STATUS_LABELS,
  type MatchStatus,
} from "@/lib/competition";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function PadresPartidosPage() {
  const { session } = await getActiveMembership();
  const [matches, tournaments, callups] = await Promise.all([
    getMyChildrenMatches(session.user.id),
    getMyChildrenTournaments(session.user.id),
    getMyChildrenCallups(session.user.id),
  ]);

  // Convocatorias por partido: { callupId, studentName, rsvp } por matchId.
  const callupsByMatch = new Map<
    string,
    { callupId: string; studentName: string; rsvp: RsvpStatus }[]
  >();
  for (const c of callups) {
    if (!c.matchId) continue;
    const list = callupsByMatch.get(c.matchId) ?? [];
    list.push({
      callupId: c.id,
      studentName: c.student.firstName,
      rsvp: c.rsvp as RsvpStatus,
    });
    callupsByMatch.set(c.matchId, list);
  }

  const tables = tournaments
    .map((t) => ({
      id: t.id,
      name: t.name,
      format: t.format,
      rows: t.standings
        .map((s) => ({
          ...s,
          pts: s.won * 3 + s.drawn,
          gd: s.goalsFor - s.goalsAgainst,
        }))
        .sort(
          (a, b) => b.pts - a.pts || b.gd - a.gd || b.goalsFor - a.goalsFor
        ),
    }))
    .filter((t) => t.rows.length > 0);

  const upcoming = matches
    .filter((m) => m.status === "scheduled" || m.status === "postponed")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
  const finished = matches.filter(
    (m) => m.status === "played" || m.status === "canceled"
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Partidos"
        title="Partidos"
        subtitle="Próximos partidos y resultados de los equipos de tus hijos."
      />

      {matches.length === 0 && tables.length === 0 ? (
        <EmptyState
          title="Sin partidos por ahora"
          description="Cuando la escuela agende partidos del equipo de tu hijo, aparecerán aquí."
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg font-bold">Próximos</h2>
              <ul className="space-y-2">
                {upcoming.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    callups={callupsByMatch.get(m.id)}
                    isScorekeeper={m.scorekeeperUserId === session.user.id}
                  />
                ))}
              </ul>
            </section>
          )}
          {finished.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg font-bold">Resultados</h2>
              <ul className="space-y-2">
                {finished.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </ul>
            </section>
          )}

          {tables.map((t) => (
            <section key={t.id} className="mb-8">
              <h2 className="font-display text-lg font-bold">{t.name}</h2>
              <p className="mb-3 text-xs text-ink-soft">
                Tabla de posiciones · {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
              </p>
              <StandingsTable rows={t.rows} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}

type StandingRow = {
  id: string;
  teamName: string;
  isOurs: boolean;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  pts: number;
  gd: number;
};

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink/10">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
          <tr>
            <th className="px-2 py-2 text-center font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Equipo</th>
            <th className="px-2 py-2 text-center font-medium">PJ</th>
            <th className="px-2 py-2 text-center font-medium">G</th>
            <th className="px-2 py-2 text-center font-medium">E</th>
            <th className="px-2 py-2 text-center font-medium">P</th>
            <th className="px-2 py-2 text-center font-medium">DG</th>
            <th className="px-2 py-2 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr
              key={s.id}
              className={`border-t border-ink/10 ${s.isOurs ? "bg-pitch/[0.06] font-semibold" : ""}`}
            >
              <td className="px-2 py-2 text-center text-ink-soft">{i + 1}</td>
              <td className="px-3 py-2 text-ink">{s.teamName}</td>
              <td className="px-2 py-2 text-center">{s.won + s.drawn + s.lost}</td>
              <td className="px-2 py-2 text-center">{s.won}</td>
              <td className="px-2 py-2 text-center">{s.drawn}</td>
              <td className="px-2 py-2 text-center">{s.lost}</td>
              <td className="px-2 py-2 text-center">{s.gd}</td>
              <td className="px-2 py-2 text-center font-display font-bold text-ink">
                {s.pts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Row = {
  id: string;
  opponentName: string;
  isHome: boolean;
  kickoffAt: Date;
  location: string | null;
  mapUrl: string | null;
  requiredUniform: string | null;
  scorekeeperUserId: string | null;
  status: string;
  ourScore: number | null;
  opponentScore: number | null;
  team: { name: string };
};

function MatchRow({
  match: m,
  callups,
  isScorekeeper,
}: {
  match: Row;
  callups?: { callupId: string; studentName: string; rsvp: string }[];
  isScorekeeper?: boolean;
}) {
  const result = resultOf(m.ourScore, m.opponentScore);
  const tone =
    result === "win"
      ? "text-pitch"
      : result === "loss"
        ? "text-red-600"
        : "text-ink";

  return (
    <li className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {m.team.name} <span className="text-ink-soft">{m.isHome ? "vs" : "@"}</span>{" "}
            {m.opponentName}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {formatKickoff(m.kickoffAt)}
            {m.location ? ` · ${m.location}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {m.status === "played" ? (
            <span className={`font-display text-lg font-bold ${tone}`}>
              {scoreLabel(m.ourScore, m.opponentScore)}
            </span>
          ) : (
            <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              {MATCH_STATUS_LABELS[m.status as MatchStatus]}
            </span>
          )}
        </div>
      </div>
      {(m.mapUrl || m.requiredUniform) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {m.mapUrl && (
            <a
              href={m.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-pitch hover:underline"
            >
              📍 Ver ubicación
            </a>
          )}
          {m.requiredUniform && (
            <span className="text-ink-soft">👕 {m.requiredUniform}</span>
          )}
        </div>
      )}
      {isScorekeeper && (
        <a
          href={`/estadistico/${m.id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pitch hover:underline"
        >
          📊 Capturar este partido en vivo →
        </a>
      )}
      {callups && callups.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-ink/10 pt-3">
          <p className="text-xs font-medium text-ink-soft">
            Convocado · confirma asistencia
          </p>
          {callups.map((c) => (
            <RsvpButtons
              key={c.callupId}
              callupId={c.callupId}
              rsvp={c.rsvp as RsvpStatus}
              studentName={c.studentName}
            />
          ))}
        </div>
      )}
    </li>
  );
}
