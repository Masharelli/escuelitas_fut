import Link from "next/link";
import Image from "next/image";

import { auth } from "@/auth";
import { getInvitationByToken } from "@/lib/invitations";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { acceptInvitationAction } from "./actions";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation || invitation.status === "revoked") {
    return (
      <AuthShell
        title="Invitación no válida"
        subtitle="Este enlace ya no está disponible. Pídele a la escuela que te genere uno nuevo."
      >
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-pitch px-5 py-2.5 text-sm font-semibold text-chalk transition hover:bg-pitch-deep"
        >
          Ir al inicio
        </Link>
      </AuthShell>
    );
  }

  const student = invitation.student;
  const childName = `${student.firstName} ${student.lastName}`;
  const schoolName = student.tenant?.name;
  const next = `/invitacion/${token}`;

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <AuthShell
      title="Invitación de tutor"
      subtitle={
        schoolName
          ? `${schoolName} te invita a seguir a tu hijo.`
          : "Te invitaron a seguir a tu hijo."
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
      <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-chalk-deep/40 p-4">
        <Avatar name={student.firstName} photoUrl={student.photoUrl} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{childName}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {student.category && <Badge>{student.category.name}</Badge>}
            {student.team && <Badge>{student.team.name}</Badge>}
          </div>
        </div>
      </div>

      {isLoggedIn ? (
        <form action={acceptInvitationAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton>Vincular a mi cuenta</SubmitButton>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Entraste como {session.user?.email}. Quedará en tu portal de padres.
          </p>
        </form>
      ) : (
        <div className="mt-6">
          <Link
            href={`/registro?next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center rounded-full bg-pitch px-5 py-3 text-sm font-semibold text-chalk shadow-sm transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            Crear cuenta para ver a {student.firstName}
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Crea tu cuenta y verás a {student.firstName} al instante.
          </p>
        </div>
      )}
    </AuthShell>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={56}
        height={56}
        unoptimized
        className="h-14 w-14 shrink-0 rounded-full border border-ink/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pitch/10 text-xl font-semibold text-pitch">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}
