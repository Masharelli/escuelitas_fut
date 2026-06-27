import Link from "next/link";
import { notFound } from "next/navigation";

import { getSchoolBySlug } from "@/lib/tenant-public";
import { getPublicSeasonData } from "@/lib/league-public";
import { sportConfig, type Sport } from "@/lib/sports";
import { computeStandings, computeLeaders } from "@/lib/league";
import { TenantTheme } from "@/components/brand/tenant-theme";

export default async function PublicSeasonPage({
  params,
}: {
  params: Promise<{ slug: string; seasonId: string }>;
}) {
  const { slug, seasonId } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school || school.kind !== "league") notFound();

  const data = await getPublicSeasonData(school.id, seasonId);
  if (!data) notFound();
  const { season, teams, matches, stats } = data;
  const cfg = sportConfig(school.sport as Sport);

  const teamMeta = new Map(teams.map((t) => [t.teamId, t.team] as const));
  const teamIds = teams.map((t) => t.teamId);

  const played = matches
    .filter((m) => m.status === "played" && m.homeScore != null && m.awayScore != null)
    .map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore as number,
      awayScore: m.awayScore as number,
    }));
  const standings = computeStandings(teamIds, played, cfg.standings);

  // Líderes por la estadística principal del deporte (goleo, etc.).
  const mainStat = cfg.playerStats[0];
  const leaders = computeLeaders(
    stats.map((s) => ({
      playerId: s.playerId,
      name: s.player.name,
      teamName: teamMeta.get(s.teamId)?.name ?? "—",
      value: s.stats[mainStat.key] ?? 0,
    }))
  );

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <TenantTheme primaryColor={school.primaryColor}>
      <main className="w-full min-w-0 flex-1 bg-chalk text-ink">
        <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6">
          <Link
            href={`/e/${school.slug}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {school.name}
          </Link>

          <p className="text-sm font-medium text-pitch">{cfg.emoji} {cfg.label}</p>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight">
            {season.name}
          </h1>

          {/* Tabla */}
          <h2 className="mt-8 mb-2 font-display text-lg font-bold">Tabla de posiciones</h2>
          {teamIds.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Sin equipos todavía.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white/80 shadow-sm">
              <table className="w-full min-w-[440px] text-sm">
                <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Equipo</th>
                    <th className="px-2 py-2 text-center font-medium">PJ</th>
                    <th className="px-2 py-2 text-center font-medium">G</th>
                    {cfg.standings.hasDraws && (
                      <th className="px-2 py-2 text-center font-medium">E</th>
                    )}
                    <th className="px-2 py-2 text-center font-medium">P</th>
                    <th className="px-2 py-2 text-center font-medium">AF</th>
                    <th className="px-2 py-2 text-center font-medium">EC</th>
                    <th className="px-2 py-2 text-center font-medium">DIF</th>
                    <th className="px-3 py-2 text-center font-semibold text-ink">
                      {cfg.standings.rankBy === "points" ? "Pts" : "%"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const team = teamMeta.get(row.teamId);
                    return (
                      <tr key={row.teamId} className="border-t border-ink/10">
                        <td className="px-3 py-2 text-ink-soft">{i + 1}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: team?.color || "var(--color-pitch)" }}
                            />
                            <span className="truncate font-medium text-ink">{team?.name ?? "—"}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-ink-soft">{row.played}</td>
                        <td className="px-2 py-2 text-center text-ink-soft">{row.won}</td>
                        {cfg.standings.hasDraws && (
                          <td className="px-2 py-2 text-center text-ink-soft">{row.drawn}</td>
                        )}
                        <td className="px-2 py-2 text-center text-ink-soft">{row.lost}</td>
                        <td className="px-2 py-2 text-center text-ink-soft">{row.for}</td>
                        <td className="px-2 py-2 text-center text-ink-soft">{row.against}</td>
                        <td className="px-2 py-2 text-center text-ink-soft">
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </td>
                        <td className="px-3 py-2 text-center font-display font-bold text-ink">
                          {cfg.standings.rankBy === "points"
                            ? row.points
                            : `${Math.round(row.winPct * 100)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Líderes */}
          {leaders.length > 0 && (
            <>
              <h2 className="mt-8 mb-2 font-display text-lg font-bold">
                Líderes · {mainStat.label}
              </h2>
              <ol className="space-y-1.5">
                {leaders.map((l, i) => (
                  <li
                    key={l.playerId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 shadow-sm"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-center font-display font-bold text-ink-soft">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{l.name}</span>
                        <span className="block truncate text-xs text-ink-soft">{l.teamName}</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-lg font-bold text-pitch">
                      {l.value}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {/* Calendario */}
          {matches.length > 0 && (
            <>
              <h2 className="mt-8 mb-2 font-display text-lg font-bold">Calendario</h2>
              <div className="space-y-5">
                {rounds.map((round) => (
                  <div key={round}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Jornada {round}
                    </p>
                    <ul className="space-y-2">
                      {matches
                        .filter((m) => m.round === round)
                        .map((m) => {
                          const isPlayed = m.status === "played" && m.homeScore != null;
                          return (
                            <li
                              key={m.id}
                              className="flex items-center justify-center gap-3 rounded-xl border border-ink/10 bg-white/80 px-3 py-2.5 text-sm shadow-sm"
                            >
                              <span className="min-w-0 flex-1 truncate text-right font-medium text-ink">
                                {m.homeTeam.name}
                              </span>
                              <span className="shrink-0 rounded-md bg-chalk-deep px-2.5 py-1 font-display font-bold text-ink">
                                {isPlayed ? `${m.homeScore} – ${m.awayScore}` : "vs"}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-left font-medium text-ink">
                                {m.awayTeam.name}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="mt-10 text-center text-xs text-ink-soft/80">
            Con tecnología de{" "}
            <Link href="/" className="font-semibold text-pitch hover:underline">
              Escuelitas Fut
            </Link>
          </p>
        </div>
      </main>
    </TenantTheme>
  );
}
