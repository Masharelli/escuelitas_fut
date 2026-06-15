"use server";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/tenant";
import { acceptInvitation } from "@/lib/invitations";

/** Vincula al usuario actual con el alumno de la invitación. */
export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/");

  const session = await requireAuth();
  const studentId = await acceptInvitation(token, session.user.id);

  redirect(studentId ? `/padres/hijos/${studentId}` : "/padres");
}
