import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { memberships } from "@/db/schema";

export type Role = "owner" | "admin" | "coach" | "parent";

/** Roles que tienen acceso al portal de administración. */
export const ADMIN_ROLES: Role[] = ["owner", "admin", "coach"];

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

/**
 * Resuelve la membresía "activa" del usuario. Por ahora toma la primera;
 * cuando un usuario pertenezca a varias escuelas agregaremos un selector
 * y guardaremos la elección. Redirige a /onboarding si no tiene ninguna.
 */
export async function getActiveMembership() {
  const session = await requireAuth();
  const mine = await getMyMemberships(session.user.id);

  if (mine.length === 0) {
    redirect("/onboarding");
  }

  return { session, membership: mine[0], all: mine };
}

/** Exige que la membresía activa tenga uno de los roles indicados. */
export async function requireRole(allowed: Role[]) {
  const ctx = await getActiveMembership();
  if (!allowed.includes(ctx.membership.role as Role)) {
    redirect("/");
  }
  return ctx;
}
