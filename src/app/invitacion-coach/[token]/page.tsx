import Link from "next/link";

import { auth } from "@/auth";
import { getStaffInvitationByToken } from "@/lib/staff-invitations";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { LogoutButton } from "@/components/logout-button";
import { acceptStaffInvitationAction } from "./actions";

export default async function InvitacionCoachPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getStaffInvitationByToken(token);

  if (!invitation) {
    return (
      <AuthShell
        title="Invitación no válida"
        subtitle="Este enlace ya no está disponible. Pídele a la escuela uno nuevo."
      >
        <Link
          href="/"
          className="glass-button inline-flex items-center justify-center rounded-full bg-pitch px-5 py-2.5 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
        >
          Ir al inicio
        </Link>
      </AuthShell>
    );
  }

  const schoolName = invitation.school?.name;
  const isAdmin = invitation.role === "admin";
  const teamName = invitation.team?.name;
  const next = `/invitacion-coach/${token}`;

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const matchesRecipient = session?.user?.email?.trim().toLowerCase() === invitation.email?.trim().toLowerCase();

  return (
    <AuthShell
      title={isAdmin ? "Invitación de administrador" : "Invitación de profesor"}
      subtitle={
        schoolName
          ? `${schoolName} te invita como ${isAdmin ? "administrador" : "profesor"}${teamName ? ` de ${teamName}` : ""}.`
          : "Te invitaron como entrenador."
      }
      footer={
        isLoggedIn ? undefined : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-semibold text-pitch hover:text-pitch-deep"
            >
              Inicia sesión
            </Link>
          </>
        )
      }
    >
      <div className="rounded-2xl border border-ink/10 bg-chalk-deep/40 p-4">
        <p className="text-sm text-ink-soft">{isAdmin ? "Acceso operativo" : "Equipo"}</p>
        <p className="font-semibold text-ink">{isAdmin ? "Registro de pagos, gastos y control de alumnos" : teamName ?? "Equipo asignado"}</p>
      </div>

      {isLoggedIn && !matchesRecipient ? (
        <div className="mt-6 space-y-3">
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Esta invitación está dirigida a otra cuenta. Cierra sesión e inicia con el correo al que te invitaron.
          </p>
          <LogoutButton />
        </div>
      ) : isLoggedIn ? (
        <form action={acceptStaffInvitationAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton>Aceptar invitación</SubmitButton>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Entraste como {session.user?.email}. Quedará en tu portal de
            {isAdmin ? "administración" : "profesor"}.
          </p>
        </form>
      ) : (
        <div className="mt-6">
          <Link
            href={`/registro?next=${encodeURIComponent(next)}`}
            className="glass-button flex w-full items-center justify-center rounded-full bg-pitch px-5 py-3 text-sm font-semibold text-chalk shadow-sm transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            Crear cuenta de {isAdmin ? "administrador" : "profesor"}
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Crea tu cuenta y tendrás acceso al equipo al instante.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
