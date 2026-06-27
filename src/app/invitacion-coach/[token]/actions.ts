"use server";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/tenant";
import { acceptStaffInvitation } from "@/lib/staff-invitations";

/** Vincula al usuario actual como entrenador del equipo de la invitación. */
export async function acceptStaffInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/");

  const session = await requireAuth();
  const schoolId = await acceptStaffInvitation(token, session.user.id);

  redirect(schoolId ? "/coach" : "/");
}
