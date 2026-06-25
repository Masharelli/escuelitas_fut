"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { schools, memberships } from "@/db/schema";
import { requireAuth } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import { SPORTS } from "@/lib/sports";

export type ActionState = { error?: string } | undefined;

const schoolSchema = z.object({
  name: z.string().min(2, "Escribe el nombre"),
  kind: z.enum(["academy", "league"]).default("academy"),
  sport: z.enum(SPORTS as [string, ...string[]]).default("futbol"),
});

/** Genera un slug único agregando un sufijo numérico si ya existe. */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "escuela";
  let candidate = root;
  let n = 1;
  while (
    await db.query.schools.findFirst({ where: eq(schools.slug, candidate) })
  ) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function createSchool(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind") ?? "academy",
    sport: formData.get("sport") ?? "futbol",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const slug = await uniqueSlug(parsed.data.name);

  const [school] = await db
    .insert(schools)
    .values({
      name: parsed.data.name,
      slug,
      kind: parsed.data.kind,
      sport: parsed.data.sport as (typeof SPORTS)[number],
    })
    .returning();

  await db.insert(memberships).values({
    userId: session.user.id,
    schoolId: school.id,
    role: "owner",
  });

  redirect("/admin");
}
