"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

export type FormState = { error?: string; ok?: boolean } | undefined;

const tournamentSchema = z.object({
  name: z.string().min(1, "Escribe el nombre del torneo"),
  format: z.enum(["league", "cup", "friendly"]),
  categoryId: z.string().nullish(),
  startsOn: z.string().nullish(),
  endsOn: z.string().nullish(),
});

export async function createTournament(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = tournamentSchema.safeParse({
    name: formData.get("name"),
    format: formData.get("format"),
    categoryId: formData.get("categoryId"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const tdb = tenantDb(membership.schoolId);
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await tdb.categories.findById(parsed.data.categoryId);
    if (cat) categoryId = cat.id;
  }

  await tdb.tournaments.insert({
    name: parsed.data.name,
    format: parsed.data.format,
    categoryId,
    startsOn: parsed.data.startsOn || null,
    endsOn: parsed.data.endsOn || null,
  });

  revalidatePath("/admin/torneos");
  return { ok: true };
}

export async function deleteTournament(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).tournaments.deleteById(id);
  }
  revalidatePath("/admin/torneos");
  redirect("/admin/torneos");
}

const intField = (fd: FormData, name: string) =>
  Math.max(0, Math.trunc(Number(fd.get(name)) || 0));

const standingSchema = z.object({
  tournamentId: z.string().min(1),
  teamName: z.string().min(1, "Escribe el nombre del equipo"),
});

export async function addStanding(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { membership } = await requireRole(ADMIN_ROLES);
  const parsed = standingSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    teamName: formData.get("teamName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const tdb = tenantDb(membership.schoolId);
  const tournament = await tdb.tournaments.findById(parsed.data.tournamentId);
  if (!tournament) return { error: "Torneo inválido" };

  const won = intField(formData, "won");
  const drawn = intField(formData, "drawn");
  const lost = intField(formData, "lost");

  await tdb.tournamentStandings.insert({
    tournamentId: tournament.id,
    teamName: parsed.data.teamName.trim(),
    isOurs: formData.get("isOurs") === "on",
    won,
    drawn,
    lost,
    played: won + drawn + lost,
    goalsFor: intField(formData, "goalsFor"),
    goalsAgainst: intField(formData, "goalsAgainst"),
  });

  revalidatePath(`/admin/torneos/${tournament.id}`);
  return { ok: true };
}

export async function updateStanding(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!id) return;

  const won = intField(formData, "won");
  const drawn = intField(formData, "drawn");
  const lost = intField(formData, "lost");

  await tenantDb(membership.schoolId).tournamentStandings.updateById(id, {
    won,
    drawn,
    lost,
    played: won + drawn + lost,
    goalsFor: intField(formData, "goalsFor"),
    goalsAgainst: intField(formData, "goalsAgainst"),
  });
  revalidatePath(`/admin/torneos/${tournamentId}`);
}

export async function deleteStanding(formData: FormData) {
  const { membership } = await requireRole(ADMIN_ROLES);
  const id = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (id) {
    await tenantDb(membership.schoolId).tournamentStandings.deleteById(id);
  }
  revalidatePath(`/admin/torneos/${tournamentId}`);
}
