import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { memberships } from "@/db/schema";

export type Role = "owner" | "admin" | "coach" | "parent";

/** Roles que tienen acceso al portal de administración. */
export const ADMIN_ROLES: Role[] = ["owner", "admin", "coach"];

/** Cookie con la escuela activa elegida por el usuario (multi-escuela). */
export const ACTIVE_SCHOOL_COOKIE = "active_school";

/**
 * Devuelve la sesión o redirige a /login. Úsalo en páginas/acciones privadas.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/** Membresías (escuela + rol) del usuario actual, con la escuela incluida. */
export async function getMyMemberships(userId: string) {
  return db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
    with: { school: true },
  });
}

/** Lee de la cookie qué escuela eligió el usuario (o undefined). */
export async function getActiveSchoolId() {
  const store = await cookies();
  return store.get(ACTIVE_SCHOOL_COOKIE)?.value || undefined;
}

/**
 * Elige una membresía entre las candidatas honrando la preferencia (cookie).
 * Si la preferida no está entre las candidatas (p. ej. cookie manipulada o de
 * una escuela sin el rol requerido), cae a la primera candidata. Nunca confía
 * en la cookie para dar acceso: sólo elige entre lo que el usuario ya tiene.
 */
function pickPreferred<T extends { schoolId: string }>(
  candidates: T[],
  preferredId?: string
): T {
  if (preferredId) {
    const match = candidates.find((c) => c.schoolId === preferredId);
    if (match) return match;
  }
  return candidates[0];
}

type Membership = Awaited<ReturnType<typeof getMyMemberships>>[number];

/**
 * Resuelve la membresía "activa" del usuario, respetando la escuela elegida en
 * la cookie. Redirige a /onboarding si no tiene ninguna. `all` trae todas sus
 * membresías para poder ofrecer un selector de escuela.
 */
export async function getActiveMembership() {
  const session = await requireAuth();
  const mine = await getMyMemberships(session.user.id);

  if (mine.length === 0) {
    redirect("/onboarding");
  }

  const membership = pickPreferred(mine, await getActiveSchoolId());

  return { session, membership, all: mine };
}

/**
 * Exige que el usuario tenga, en alguna escuela, uno de los roles indicados, y
 * devuelve esa membresía como la activa. Si tiene el rol en varias escuelas,
 * respeta la elegida en la cookie. Si no lo tiene en ninguna, redirige a "/".
 *
 * `candidates` son las membresías con un rol permitido (para el selector del
 * portal); `all` son todas (por si se necesitan).
 */
export async function requireRole(allowed: Role[]) {
  const session = await requireAuth();
  const mine = await getMyMemberships(session.user.id);

  if (mine.length === 0) {
    redirect("/onboarding");
  }

  const candidates: Membership[] = mine.filter((m) =>
    allowed.includes(m.role as Role)
  );
  if (candidates.length === 0) {
    redirect("/");
  }

  const membership = pickPreferred(candidates, await getActiveSchoolId());

  return { session, membership, all: mine, candidates };
}
