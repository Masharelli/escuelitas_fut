import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { coachTeams, memberships, staffInvitations, teams } from "@/db/schema";
import { hasCoachAccess, requireRole, OWNER_ROLES } from "@/lib/tenant";
import { isPendingInvitation } from "@/lib/invitation-validity";
import { PageHeader, Card } from "@/components/ui";
import { StaffInviteForm } from "./invite-form";
import { grantStaffAdministration, removeStaffAccess, revokeUserInvitation } from "./actions";

export default async function UsuariosPage() {
  const { membership } = await requireRole(OWNER_ROLES);
  const schoolId = membership.schoolId;
  const [staff, invites, schoolTeams, assignments] = await Promise.all([
    db.query.memberships.findMany({
      where: and(eq(memberships.schoolId, schoolId), inArray(memberships.role, ["admin", "coach"])),
      with: { user: { columns: { name: true, email: true } } },
    }),
    db.query.staffInvitations.findMany({
      where: and(eq(staffInvitations.schoolId, schoolId), inArray(staffInvitations.role, ["admin", "coach"]), eq(staffInvitations.status, "pending")),
      with: { team: { columns: { name: true } } },
      orderBy: [desc(staffInvitations.createdAt)],
    }),
    db.query.teams.findMany({ where: eq(teams.schoolId, schoolId), columns: { id: true, name: true }, orderBy: [asc(teams.name)] }),
    db.query.coachTeams.findMany({ where: eq(coachTeams.schoolId, schoolId), with: { team: { columns: { name: true } } } }),
  ]);
  const h = await headers();
  const origin = process.env.APP_URL ?? `https://${h.get("host")}`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader eyebrow="Control del dueño" title="Usuarios y permisos" subtitle="Invita administradores y entrenadores y administra sus accesos a la escuela." />
      <Card><StaffInviteForm teams={schoolTeams} /></Card>
      <h2 className="mb-3 mt-6 font-display text-lg font-bold">Accesos activos</h2>
      {staff.length ? (
        <ul className="space-y-3">
          {staff.map((person) => {
            const teamNames = assignments.filter((assignment) => assignment.userId === person.userId).map((assignment) => assignment.team.name);
            const coaches = hasCoachAccess(person);
            const bothRoles = person.role === "admin" && coaches;
            return (
              <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4">
                <div className="min-w-0 flex-[1_1_16rem]">
                  <p className="font-semibold leading-snug">{person.user.name ?? (person.role === "coach" ? "Entrenador" : "Administrador")}</p>
                  <p className="text-sm text-ink-soft">{person.user.email}</p>
                  {person.role === "admin" && <p className="text-sm text-ink-soft">Administrador</p>}
                  {coaches && <p className="text-sm text-ink-soft">Entrenador · {teamNames.join(", ") || "Sin equipo asignado"}</p>}
                </div>
                <div className="flex max-w-full flex-wrap gap-2">
                  {person.role === "coach" && (
                    <form action={grantStaffAdministration}>
                      <input type="hidden" name="id" value={person.id} />
                      <button className="min-h-11 rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-chalk">
                        Dar acceso de administrador
                      </button>
                    </form>
                  )}
                  {bothRoles ? (
                    <>
                      <RemoveAccess id={person.id} email={person.user.email} role="admin" label="Retirar administración" />
                      <RemoveAccess id={person.id} email={person.user.email} role="coach" label="Retirar entrenamiento" />
                    </>
                  ) : <RemoveAccess id={person.id} email={person.user.email} label="Retirar acceso" />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-ink-soft">Todavía no hay administradores ni entrenadores.</p>}
      <h2 className="mb-3 mt-6 font-display text-lg font-bold">Invitaciones</h2>
      <p className="mb-3 text-sm text-ink-soft">Comparte cada enlace solo con la persona indicada. Caduca en siete días y sirve para una sola cuenta.</p>
      <ul className="space-y-3">
        {invites.map((invitation) => (
          <li key={invitation.id} className="rounded-xl border border-ink/10 bg-white p-4">
            <p className="font-semibold">{invitation.role === "coach" ? `Entrenador · ${invitation.team?.name ?? "Equipo eliminado"}` : "Administrador"}</p>
            <p className="mb-2 text-sm">{invitation.email ?? "Sin correo asignado"} · {isPendingInvitation(invitation) ? "Pendiente" : "Vencida; crea una nueva invitación"}</p>
            {isPendingInvitation(invitation) && (
              <label className="block text-sm text-ink-soft">
                Enlace de acceso
                <input readOnly value={`${origin}/invitacion-coach/${invitation.token}`} className="mt-1 w-full rounded-lg border border-ink/15 p-2 text-xs" />
              </label>
            )}
            <form action={revokeUserInvitation} className="mt-2">
              <input type="hidden" name="id" value={invitation.id} />
              <button aria-label={`Revocar invitación de ${invitation.email ?? "entrenador"}`} className="text-sm text-red-700">Revocar invitación</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RemoveAccess({ id, email, role, label }: {
  id: string;
  email: string;
  role?: "admin" | "coach";
  label: string;
}) {
  return (
    <form action={removeStaffAccess}>
      <input type="hidden" name="id" value={id} />
      {role && <input type="hidden" name="role" value={role} />}
      <button aria-label={`${label} de ${email}`} className="min-h-11 rounded-full border border-ink/15 px-4 py-2 text-sm text-red-700">
        {label}
      </button>
    </form>
  );
}
