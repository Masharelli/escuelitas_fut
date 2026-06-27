"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { seasonTeams, leagueMatches, schools } from "@/db/schema";
import { generateRoundRobin } from "@/lib/league";
import { generateRegistrationCharges } from "@/lib/league-billing";
import { getStripe } from "@/lib/stripe";
import { pesosToCents } from "@/lib/billing";

function revalidateSeason(seasonId?: string) {
  revalidatePath("/admin/liga/temporadas");
  if (seasonId) revalidatePath(`/admin/liga/temporadas/${seasonId}`);
}

export type FormState = { error?: string; ok?: boolean } | undefined;

const SEASON_STATUSES = ["upcoming", "active", "finished"] as const;

const seasonSchema = z.object({
  name: z.string().min(1, "Escribe el nombre de la temporada"),
  status: z.enum(SEASON_STATUSES).default("active"),
  startsOn: z.string().nullish(),
  endsOn: z.string().nullish(),
});

export async function createSeason(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status") ?? "active",
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await tenantDb(membership.schoolId).seasons.insert({
    name: parsed.data.name.trim(),
    status: parsed.data.status,
    startsOn: parsed.data.startsOn || null,
    endsOn: parsed.data.endsOn || null,
  });

  revalidatePath("/admin/liga/temporadas");
  return { ok: true };
}

export async function deleteSeason(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).seasons.deleteById(id);
  }
  revalidatePath("/admin/liga/temporadas");
}

export async function setSeasonStatus(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && (SEASON_STATUSES as readonly string[]).includes(status)) {
    await tenantDb(membership.schoolId).seasons.updateById(id, {
      status: status as (typeof SEASON_STATUSES)[number],
    });
    revalidateSeason(id);
  }
}

/** Inscribe un equipo a una temporada (idempotente: ignora si ya está). */
export async function registerTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const seasonId = String(formData.get("seasonId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!seasonId || !teamId) return;

  const tdb = tenantDb(membership.schoolId);
  const [season, team] = await Promise.all([
    tdb.seasons.findById(seasonId),
    tdb.leagueTeams.findById(teamId),
  ]);
  if (!season || !team) return;

  const existing = await tdb.seasonTeams.findFirst({
    where: and(
      eq(seasonTeams.seasonId, seasonId),
      eq(seasonTeams.teamId, teamId)
    ),
  });
  if (!existing) {
    await tdb.seasonTeams.insert({ seasonId, teamId });
  }
  revalidateSeason(seasonId);
}

export async function unregisterTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).seasonTeams.deleteById(id);
  }
  revalidateSeason(seasonId || undefined);
}

/**
 * Genera el calendario (todos contra todos) de una temporada a partir de sus
 * equipos inscritos. No hace nada si ya hay calendario (primero hay que
 * borrarlo) ni si hay menos de 2 equipos.
 */
export async function generateSchedule(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return;
  const tdb = tenantDb(membership.schoolId);

  const season = await tdb.seasons.findById(seasonId);
  if (!season) return;

  const existing = await tdb.leagueMatches.findMany({
    where: eq(leagueMatches.seasonId, seasonId),
    columns: { id: true },
  });
  if (existing.length > 0) return; // ya hay calendario

  const registered = await tdb.seasonTeams.findMany({
    where: eq(seasonTeams.seasonId, seasonId),
    columns: { teamId: true },
  });
  const teamIds = registered.map((r) => r.teamId);
  if (teamIds.length < 2) return;

  const pairings = generateRoundRobin(teamIds);
  await tdb.leagueMatches.insertMany(
    pairings.map((p) => ({
      seasonId,
      round: p.round,
      homeTeamId: p.homeId,
      awayTeamId: p.awayId,
    }))
  );
  revalidateSeason(seasonId);
}

export async function clearSchedule(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const seasonId = String(formData.get("seasonId") ?? "");
  if (seasonId) {
    await tenantDb(membership.schoolId).leagueMatches.deleteBySeason(seasonId);
    revalidateSeason(seasonId);
  }
}

// ---------------------------------------------------------------------------
// Inscripciones (L4)
// ---------------------------------------------------------------------------

/** Define la cuota de inscripción por equipo de la temporada (vacío = sin cuota). */
export async function setRegistrationFee(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return;
  const raw = String(formData.get("fee") ?? "").trim();
  const cents = raw === "" ? null : pesosToCents(raw);
  await tenantDb(membership.schoolId).seasons.updateById(seasonId, {
    registrationFeeCents: cents && cents > 0 ? cents : null,
  });
  revalidateSeason(seasonId);
}

/** Genera los cargos de inscripción de los equipos inscritos (idempotente). */
export async function generateRegistration(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return;
  await generateRegistrationCharges(membership.schoolId, seasonId);
  revalidateSeason(seasonId);
}

export async function markRegistrationPaid(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).leagueCharges.updateById(id, {
      status: "paid",
      paidAt: new Date(),
    });
  }
  revalidateSeason(seasonId || undefined);
}

export async function cancelRegistrationCharge(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).leagueCharges.updateById(id, {
      status: "canceled",
    });
  }
  revalidateSeason(seasonId || undefined);
}

/**
 * Inicia (o reanuda) el onboarding de Stripe Connect de la liga y regresa a la
 * temporada. Igual que en la academia, la liga cobra a su propia cuenta.
 */
export async function connectLeagueStripe(formData: FormData) {
  const { membership } = await requireRole(["owner", "admin"]);
  const seasonId = String(formData.get("seasonId") ?? "");
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, membership.schoolId),
  });
  if (!school) return;

  const stripe = getStripe();
  let accountId = school.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "MX",
      email: school.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: { name: school.name },
    });
    accountId = account.id;
    await db
      .update(schools)
      .set({ stripeAccountId: accountId })
      .where(eq(schools.id, school.id));
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const base = `${origin}/admin/liga/temporadas/${seasonId}`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: base,
    return_url: `${base}?connected=1`,
    type: "account_onboarding",
  });
  redirect(link.url);
}

/**
 * Guarda el marcador y las estadísticas por jugador de un partido (L5). Las
 * claves de estadística (statKeys) y los jugadores (playerIds) viajan como
 * listas separadas por coma; los valores como stat_<playerId>_<clave>.
 */
export async function saveMatchStats(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!matchId) return;
  const tdb = tenantDb(membership.schoolId);
  const match = await tdb.leagueMatches.findById(matchId);
  if (!match) return;

  // Marcador (si es válido, marca el partido como jugado).
  const home = Number(formData.get("homeScore"));
  const away = Number(formData.get("awayScore"));
  if (
    Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= 0 &&
    away >= 0
  ) {
    await tdb.leagueMatches.updateById(matchId, {
      homeScore: home,
      awayScore: away,
      status: "played",
    });
  }

  // Estadísticas por jugador.
  const statKeys = String(formData.get("statKeys") ?? "")
    .split(",")
    .filter(Boolean);
  const playerIds = String(formData.get("playerIds") ?? "")
    .split(",")
    .filter(Boolean);

  const rows = playerIds
    .map((pid) => {
      const teamId = String(formData.get(`team_${pid}`) ?? "");
      const stats: Record<string, number> = {};
      let any = false;
      for (const k of statKeys) {
        const v = Math.max(0, Number(formData.get(`stat_${pid}_${k}`)) || 0);
        if (v > 0) {
          stats[k] = v;
          any = true;
        }
      }
      return any && teamId ? { playerId: pid, teamId, stats } : null;
    })
    .filter((r): r is { playerId: string; teamId: string; stats: Record<string, number> } => r !== null);

  await tdb.leagueMatchStats.replaceForMatch(matchId, rows);
  revalidateSeason(seasonId);
  if (seasonId) {
    revalidatePath(`/admin/liga/temporadas/${seasonId}/partido/${matchId}`);
  }
}

/** Guarda el marcador de un partido de liga y lo marca como jugado. */
export async function saveLeagueResult(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const matchId = String(formData.get("matchId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const home = Number(formData.get("homeScore"));
  const away = Number(formData.get("awayScore"));
  if (
    !matchId ||
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0
  ) {
    return;
  }
  await tenantDb(membership.schoolId).leagueMatches.updateById(matchId, {
    homeScore: home,
    awayScore: away,
    status: "played",
  });
  revalidateSeason(seasonId || undefined);
}
