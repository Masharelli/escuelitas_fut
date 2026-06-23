"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACTIVE_SCHOOL_COOKIE,
  getMyMemberships,
  requireAuth,
} from "@/lib/tenant";
import { safeNext } from "@/lib/safe-next";

/**
 * Fija la escuela activa del usuario en una cookie y vuelve a la página actual.
 * Sólo acepta una escuela a la que el usuario realmente pertenezca, así una
 * cookie/petición manipulada no puede otorgar acceso a otra escuela.
 */
export async function switchSchool(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "");
  const next = safeNext(formData.get("next"));

  const session = await requireAuth();
  const mine = await getMyMemberships(session.user.id);

  if (mine.some((m) => m.schoolId === schoolId)) {
    const store = await cookies();
    store.set(ACTIVE_SCHOOL_COOKIE, schoolId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect(next);
}
