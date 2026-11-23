import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { guardianships, memberships, schools, students, tournaments } from "@/db/schema";
import { getCoachTeamIds } from "@/lib/coach";
import { getInvitationByToken } from "@/lib/invitations";

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!/^(escudo|alumno|torneo)_[0-9a-f-]{36}\.(png|jpg|webp)$/.test(filename)) return missing();
  const imageUrl = `/api/images/${filename}`;
  let allowed = false;
  if (filename.startsWith("escudo_")) {
    // El escudo forma parte del perfil público de la escuela.
    allowed = !!(await db.query.schools.findFirst({ where: eq(schools.logoUrl, imageUrl), columns: { id: true } }));
  } else {
    const student = filename.startsWith("alumno_")
      ? await db.query.students.findFirst({ where: eq(students.photoUrl, imageUrl), columns: { id: true, schoolId: true, teamId: true } })
      : undefined;
    const tournament = filename.startsWith("torneo_")
      ? await db.query.tournaments.findFirst({ where: eq(tournaments.resultsImageUrl, imageUrl), columns: { schoolId: true } })
      : undefined;
    const schoolId = student?.schoolId ?? tournament?.schoolId;
    if (!schoolId) return missing();

    const token = new URL(request.url).searchParams.get("invitation");
    if (student && token) {
      const invitation = await getInvitationByToken(token);
      allowed = !!invitation && invitation.studentId === student.id;
    }
    if (!allowed) {
      const userId = (await auth())?.user?.id;
      if (!userId) return missing();
      const membership = await db.query.memberships.findFirst({
        where: and(eq(memberships.userId, userId), eq(memberships.schoolId, schoolId)),
        columns: { role: true },
      });
      allowed = membership?.role === "owner" || membership?.role === "admin";
      if (!allowed && student) {
        allowed = !!(await db.query.guardianships.findFirst({
          where: and(eq(guardianships.userId, userId), eq(guardianships.studentId, student.id)),
          columns: { id: true },
        }));
        if (!allowed && membership?.role === "coach" && student.teamId) {
          allowed = (await getCoachTeamIds(userId, schoolId)).includes(student.teamId);
        }
      }
    }
  }
  if (!allowed) return missing();

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return new Response(null, { status: 503 });
  try {
    const response = await fetch(`${url}/storage/v1/object/sign/images/${filename}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 60 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return new Response(null, { status: 503 });
    const { signedURL } = await response.json();
    if (typeof signedURL !== "string" || !signedURL.startsWith("/object/sign/images/")) return new Response(null, { status: 503 });
    return new Response(null, {
      status: 307,
      headers: { Location: `${url}/storage/v1${signedURL}`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
