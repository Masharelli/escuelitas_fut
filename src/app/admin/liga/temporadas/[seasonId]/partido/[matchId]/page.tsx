import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  leagueMatches as leagueMatchesTable,
  leagueMatchStats as statsTable,
  rosterPlayers as rosterTable,
} from "@/db/schema";
import { sportConfig, type Sport } from "@/lib/sports";
import { PageHeader, Card } from "@/components/ui";
import { MatchStatsForm } from "./match-form";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string; matchId: string }>;
}) {
  const { seasonId, matchId } = await params;
  const { membership } = await requireRole(ADMIN_ROLES);
  if (membership.school.kind !== "league") redirect("/admin");
  const tdb = tenantDb(membership.schoolId);
  const cfg = sportConfig(membership.school.sport as Sport);

  const match = await tdb.leagueMatches.findFirst({
    where: eq(leagueMatchesTable.id, matchId),
    with: {
      homeTeam: { with: { roster: { orderBy: [asc(rosterTable.name)] } } },
      awayTeam: { with: { roster: { orderBy: [asc(rosterTable.name)] } } },
    },
  });
  if (!match || match.seasonId !== seasonId) notFound();

  const stats = await tdb.leagueMatchStats.findMany({
    where: eq(statsTable.matchId, matchId),
  });
  const statsByPlayer: Record<string, Record<string, number>> = {};
  for (const s of stats) statsByPlayer[s.playerId] = s.stats;

  const toTeam = (t: typeof match.homeTeam) => ({
    name: t.name,
    roster: t.roster.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      teamId: t.id,
    })),
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href={`/admin/liga/temporadas/${seasonId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Temporada
      </Link>

      <PageHeader
        eyebrow={`${cfg.emoji} Jornada ${match.round}`}
        title={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
        subtitle={`Captura el marcador y las estadísticas (${cfg.playerStats.map((s) => s.label.toLowerCase()).join(", ")}).`}
      />

      <Card>
        <MatchStatsForm
          matchId={match.id}
          seasonId={seasonId}
          statFields={cfg.playerStats}
          scoreNoun={cfg.scoreNoun}
          home={toTeam(match.homeTeam)}
          away={toTeam(match.awayTeam)}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          statsByPlayer={statsByPlayer}
        />
      </Card>
    </div>
  );
}
