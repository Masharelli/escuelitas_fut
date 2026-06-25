"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

export type FormState = { error?: string; ok?: boolean } | undefined;

const teamSchema = z.object({
  name: z.string().min(1, "Escribe el nombre del equipo"),
  color: z.string().nullish(),
  managerName: z.string().nullish(),
  managerPhone: z.string().nullish(),
  managerEmail: z.string().nullish(),
});

export async function createLeagueTeam(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    managerName: formData.get("managerName"),
    managerPhone: formData.get("managerPhone"),
    managerEmail: formData.get("managerEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await tenantDb(membership.schoolId).leagueTeams.insert({
    name: parsed.data.name.trim(),
    color: parsed.data.color || null,
    managerName: parsed.data.managerName?.trim() || null,
    managerPhone: parsed.data.managerPhone?.trim() || null,
    managerEmail: parsed.data.managerEmail?.trim() || null,
  });

  revalidatePath("/admin/liga/equipos");
  return { ok: true };
}

export async function deleteLeagueTeam(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).leagueTeams.deleteById(id);
  }
  revalidatePath("/admin/liga/equipos");
}

const playerSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1, "Escribe el nombre del jugador"),
  number: z.string().nullish(),
  position: z.string().nullish(),
});

export async function addRosterPlayer(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = playerSchema.safeParse({
    teamId: formData.get("teamId"),
    name: formData.get("name"),
    number: formData.get("number"),
    position: formData.get("position"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const tdb = tenantDb(membership.schoolId);
  const team = await tdb.leagueTeams.findById(parsed.data.teamId);
  if (!team) return { error: "Equipo inválido" };

  await tdb.rosterPlayers.insert({
    teamId: team.id,
    name: parsed.data.name.trim(),
    number: parsed.data.number?.trim() || null,
    position: parsed.data.position?.trim() || null,
  });

  revalidatePath(`/admin/liga/equipos/${team.id}`);
  return { ok: true };
}

export async function removeRosterPlayer(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).rosterPlayers.deleteById(id);
  }
  if (teamId) revalidatePath(`/admin/liga/equipos/${teamId}`);
}
