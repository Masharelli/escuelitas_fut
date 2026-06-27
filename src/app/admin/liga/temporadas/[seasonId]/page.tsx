import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  seasons as seasonsTable,
  leagueMatches as leagueMatchesTable,
  leagueTeams as leagueTeamsTable,
  leagueCharges as leagueChargesTable,
} from "@/db/schema";
import { sportConfig, type Sport } from "@/lib/sports";
import { computeStandings } from "@/lib/league";
import { refreshConnectStatus } from "@/lib/stripe";
import { formatMoney } from "@/lib/billing";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { RegisterTeamForm } from "../forms";
import {
  deleteSeason,
  setSeasonStatus,
  unregisterTeam,
  generateSchedule,
  clearSchedule,
  saveLeagueResult,
  setRegistrationFee,
  generateRegistration,
  markRegistrationPaid,
  cancelRegistrationCharge,
  connectLeagueStripe,
} from "../actions";

const CHARGE_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-tangerine/15 text-tangerine" },
  paid: { label: "Pagado", cls: "bg-pitch/15 text-pitch" },
  canceled: { label: "Cancelado", cls: "bg-ink/10 text-ink-soft" },
};

export default async function SeasonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ seasonId: string }>;
  searchParams: Promise<{ connected?: string }>;
}) {
  const { seasonId } = await params;
  const { connected } = await searchParams;
  const { membership } = await requireRole(ADMIN_ROLES);
  if (membership.school.kind !== "league") redirect("/admin");
  const tdb = tenantDb(membership.schoolId);
  const cfg = sportConfig(membership.school.sport as Sport);
  const school = membership.school;

  // Al volver del onboarding de Stripe, consulta el estado real.
  let chargesEnabled = school.stripeChargesEnabled;
  if (connected && school.stripeAccountId && !chargesEnabled) {
    const st = await refreshConnectStatus(school.id, school.stripeAccountId);
    chargesEnabled = st.chargesEnabled;
  }

  const season = await tdb.seasons.findFirst({
    where: eq(seasonsTable.id, seasonId),
    with: { seasonTeams: { with: { team: true } } },
  });
  if (!season) notFound();

  const [matches, allTeams, charges] = await Promise.all([
    tdb.leagueMatches.findMany({
      where: eq(leagueMatchesTable.seasonId, seasonId),
      with: { homeTeam: true, awayTeam: true },
      orderBy: [asc(leagueMatchesTable.round)],
    }),
    tdb.leagueTeams.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(leagueTeamsTable.name)],
    }),
    tdb.leagueCharges.findMany({
      where: eq(leagueChargesTable.seasonId, seasonId),
      with: { team: true },
    }),
  ]);

  const sortedCharges = [...charges].sort((a, b) =>
    a.team.name.localeCompare(b.team.name)
  );
  const paidCents = charges
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amountCents, 0);
  const pendingCents = charges
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.amountCents, 0);
  const feePesos = season.registrationFeeCents
    ? String(season.registrationFeeCents / 100)
    : "";

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;

  // Datos para la tabla.
  const teamMeta = new Map(
    season.seasonTeams.map((st) => [st.teamId, st.team] as const)
  );
  const teamIds = season.seasonTeams.map((st) => st.teamId);
  const played = matches
    .filter(
      (m) => m.status === "played" && m.homeScore != null && m.awayScore != null
    )
    .map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore as number,
      awayScore: m.awayScore as number,
    }));
  const standings = computeStandings(teamIds, played, cfg.standings);

  // Inscripción: equipos aún no inscritos.
  const registeredIds = new Set(teamIds);
  const registerOptions = allTeams
    .filter((t) => !registeredIds.has(t.id))
    .map((t) => ({ value: t.id, label: t.name }));

  // Calendario por jornada.
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const hasSchedule = matches.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/liga/temporadas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Temporadas
        </Link>
        <Link
          href={`/e/${school.slug}/temporada/${seasonId}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-pitch transition hover:underline"
        >
          Ver página pública
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <PageHeader
        eyebrow={`${cfg.emoji} ${cfg.label}`}
        title={season.name}
        action={
          <div className="flex items-center gap-2">
            <form action={setSeasonStatus} className="flex items-center gap-1">
              <input type="hidden" name="id" value={season.id} />
              <select
                name="status"
                defaultValue={season.status}
                className="rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-xs text-ink shadow-sm"
              >
                <option value="upcoming">Próxima</option>
                <option value="active">En curso</option>
                <option value="finished">Terminada</option>
              </select>
              <button
                type="submit"
                className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink"
              >
                Guardar
              </button>
            </form>
            <form action={deleteSeason}>
              <input type="hidden" name="id" value={season.id} />
              <button
                type="submit"
                aria-label="Eliminar temporada"
                title="Eliminar temporada"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        }
      />

      {/* Equipos inscritos */}
      <Card className="mb-5">
        <p className="mb-3 text-sm font-semibold text-ink">
          Equipos inscritos ({teamIds.length})
        </p>
        {teamIds.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {season.seasonTeams.map((st) => (
              <li
                key={st.id}
                className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-chalk py-1 pl-3 pr-1.5 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: st.team.color || "var(--color-pitch)" }}
                />
                <span className="max-w-[10rem] truncate">{st.team.name}</span>
                <form action={unregisterTeam}>
                  <input type="hidden" name="id" value={st.id} />
                  <input type="hidden" name="seasonId" value={season.id} />
                  <button
                    type="submit"
                    aria-label={`Quitar ${st.team.name}`}
                    title={`Quitar ${st.team.name}`}
                    disabled={hasSchedule}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {allTeams.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Primero registra equipos en{" "}
            <Link href="/admin/liga/equipos" className="font-medium text-pitch hover:underline">
              Equipos
            </Link>
            .
          </p>
        ) : hasSchedule ? (
          <p className="text-xs text-ink-soft">
            Borra el calendario para cambiar los equipos inscritos.
          </p>
        ) : (
          <RegisterTeamForm seasonId={season.id} options={registerOptions} />
        )}
      </Card>

      {/* Inscripciones */}
      <Card className="mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Inscripciones</p>
          {chargesEnabled ? (
            <span className="rounded-full bg-pitch/15 px-2.5 py-0.5 text-xs font-medium text-pitch">
              Cobros en línea activos ✓
            </span>
          ) : (
            <form action={connectLeagueStripe}>
              <input type="hidden" name="seasonId" value={season.id} />
              <button
                type="submit"
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
              >
                {school.stripeAccountId ? "Terminar configuración" : "Conectar pagos"}
              </button>
            </form>
          )}
        </div>

        <form action={setRegistrationFee} className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="seasonId" value={season.id} />
          <span className="text-ink-soft">Cuota por equipo $</span>
          <input
            name="fee"
            type="number"
            min={0}
            step="1"
            defaultValue={feePesos}
            placeholder="0"
            className="w-28 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
          />
          <button
            type="submit"
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
          >
            Guardar
          </button>
        </form>

        {season.registrationFeeCents && teamIds.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <form action={generateRegistration}>
              <input type="hidden" name="seasonId" value={season.id} />
              <button
                type="submit"
                className="rounded-full bg-pitch px-4 py-1.5 text-xs font-semibold text-chalk transition hover:bg-pitch-deep"
              >
                Generar inscripciones
              </button>
            </form>
            {charges.length > 0 && (
              <p className="text-xs text-ink-soft">
                Cobrado{" "}
                <span className="font-semibold text-pitch">{formatMoney(paidCents)}</span> ·
                Pendiente{" "}
                <span className="font-semibold text-tangerine">{formatMoney(pendingCents)}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="mb-1 text-xs text-ink-soft">
            Define la cuota e inscribe equipos para generar las inscripciones.
          </p>
        )}

        {sortedCharges.length > 0 && (
          <ul className="space-y-2">
            {sortedCharges.map((c) => {
              const st = CHARGE_STATUS[c.status] ?? CHARGE_STATUS.pending;
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-ink/10 bg-white/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.team.name}</p>
                    <p className="text-xs text-ink-soft">
                      {formatMoney(c.amountCents, c.currency)}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                    {c.status === "pending" && (
                      <>
                        {chargesEnabled && (
                          <input
                            readOnly
                            value={`${origin}/pagar/${c.id}`}
                            aria-label="Enlace de pago"
                            className="w-40 rounded-lg border border-ink/15 bg-chalk-deep/40 px-2 py-1 text-xs text-ink-soft"
                          />
                        )}
                        <form action={markRegistrationPaid}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="seasonId" value={season.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-pitch px-3 py-1.5 text-xs font-semibold text-chalk transition hover:bg-pitch-deep"
                          >
                            Marcar pagado
                          </button>
                        </form>
                        <form action={cancelRegistrationCharge}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="seasonId" value={season.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
                          >
                            Cancelar
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Tabla de posiciones */}
      <h2 className="mb-2 font-display text-lg font-bold">Tabla de posiciones</h2>
      {teamIds.length === 0 ? (
        <p className="mb-5 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
          Inscribe equipos para ver la tabla.
        </p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white/80 shadow-sm">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="bg-chalk-deep/60 text-xs text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Equipo</th>
                <th className="px-2 py-2 text-center font-medium" title="Jugados">PJ</th>
                <th className="px-2 py-2 text-center font-medium" title="Ganados">G</th>
                {cfg.standings.hasDraws && (
                  <th className="px-2 py-2 text-center font-medium" title="Empatados">E</th>
                )}
                <th className="px-2 py-2 text-center font-medium" title="Perdidos">P</th>
                <th className="px-2 py-2 text-center font-medium" title="A favor">AF</th>
                <th className="px-2 py-2 text-center font-medium" title="En contra">EC</th>
                <th className="px-2 py-2 text-center font-medium" title="Diferencia">DIF</th>
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
                        <span className="truncate font-medium text-ink">
                          {team?.name ?? "—"}
                        </span>
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

      {/* Calendario */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Calendario</h2>
        {hasSchedule ? (
          <form action={clearSchedule}>
            <input type="hidden" name="seasonId" value={season.id} />
            <button
              type="submit"
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Borrar calendario
            </button>
          </form>
        ) : (
          teamIds.length >= 2 && (
            <form action={generateSchedule}>
              <input type="hidden" name="seasonId" value={season.id} />
              <button
                type="submit"
                className="rounded-full bg-pitch px-4 py-1.5 text-xs font-semibold text-chalk transition hover:bg-pitch-deep"
              >
                Generar calendario
              </button>
            </form>
          )
        )}
      </div>

      {!hasSchedule ? (
        <EmptyState
          title="Sin calendario"
          description={
            teamIds.length < 2
              ? "Inscribe al menos 2 equipos para generar el rol de juegos."
              : "Genera el rol de juegos (todos contra todos) con el botón de arriba."
          }
        />
      ) : (
        <div className="space-y-5">
          {rounds.map((round) => (
            <div key={round}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Jornada {round}
              </p>
              <ul className="space-y-2">
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-ink/10 bg-white/80 px-3 py-2.5 shadow-sm"
                    >
                      <form
                        action={saveLeagueResult}
                        className="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap"
                      >
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="seasonId" value={season.id} />
                        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-ink">
                          {m.homeTeam.name}
                        </span>
                        <input
                          type="number"
                          min={0}
                          name="homeScore"
                          defaultValue={m.homeScore ?? ""}
                          aria-label={`${cfg.scoreNoun} de ${m.homeTeam.name}`}
                          className="w-12 rounded-lg border border-ink/15 bg-white px-1.5 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
                        />
                        <span className="text-ink-soft">–</span>
                        <input
                          type="number"
                          min={0}
                          name="awayScore"
                          defaultValue={m.awayScore ?? ""}
                          aria-label={`${cfg.scoreNoun} de ${m.awayTeam.name}`}
                          className="w-12 rounded-lg border border-ink/15 bg-white px-1.5 py-1.5 text-center text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
                        />
                        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">
                          {m.awayTeam.name}
                        </span>
                        <button
                          type="submit"
                          className="shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-pitch/40 hover:text-pitch"
                        >
                          {m.status === "played" ? "Actualizar" : "Guardar"}
                        </button>
                      </form>
                      <div className="mt-1.5 text-center">
                        <Link
                          href={`/admin/liga/temporadas/${season.id}/partido/${m.id}`}
                          className="text-xs font-medium text-ink-soft transition hover:text-pitch"
                        >
                          Estadísticas por jugador →
                        </Link>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
