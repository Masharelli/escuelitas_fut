"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { seasonTeams } from "@/db/schema";

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
    revalidatePath("/admin/liga/temporadas");
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
  revalidatePath("/admin/liga/temporadas");
}

export async function unregisterTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).seasonTeams.deleteById(id);
  }
  revalidatePath("/admin/liga/temporadas");
}
