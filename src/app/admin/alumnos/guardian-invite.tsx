"use client";

import { useState } from "react";

import { inviteGuardian, revokeGuardianInvitation } from "./actions";

type Invitation = {
  id: string;
  token: string;
  email: string | null;
  status: "pending" | "accepted" | "revoked";
  acceptedByName: string | null;
};

type LinkedGuardian = { name: string | null; email: string | null };

export function GuardianInvite({
  studentId,
  guardianEmail,
  invitations,
  linkedGuardians,
}: {
  studentId: string;
  guardianEmail: string | null;
  invitations: Invitation[];
  linkedGuardians: LinkedGuardian[];
}) {
  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Acceso de tutores</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Comparte un enlace para que el papá o la mamá vea a su hijo desde su
            propia cuenta.
          </p>
        </div>
      </div>

      {linkedGuardians.length > 0 && (
        <ul className="mt-4 space-y-2">
          {linkedGuardians.map((g, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-pitch/20 bg-pitch/[0.06] px-3.5 py-2.5"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-pitch" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {g.name ?? "Tutor"}
                </span>
                {g.email && (
                  <span className="block truncate text-xs text-ink-soft">
                    {g.email}
                  </span>
                )}
              </span>
              <span className="ml-auto shrink-0 text-xs font-medium text-pitch">
                Vinculado
              </span>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="mt-4 space-y-3">
          {pending.map((inv) => (
            <PendingInvite key={inv.id} studentId={studentId} inv={inv} />
          ))}
        </ul>
      )}

      <form action={inviteGuardian} className="mt-4">
        <input type="hidden" name="studentId" value={studentId} />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-pitch/40 hover:bg-chalk-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {pending.length > 0 ? "Generar otro enlace" : "Generar enlace de invitación"}
        </button>
      </form>

      {linkedGuardians.length === 0 && pending.length === 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          {guardianEmail
            ? `El enlace quedará asociado a ${guardianEmail} como referencia.`
            : "Aún no has registrado un correo de tutor; el enlace funciona igual."}
        </p>
      )}
    </div>
  );
}

function PendingInvite({
  studentId,
  inv,
}: {
  studentId: string;
  inv: Invitation;
}) {
  const [copied, setCopied] = useState(false);
  const path = `/invitacion/${inv.token}`;

  async function copy() {
    const url =
      typeof window !== "undefined" ? window.location.origin + path : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, el admin puede copiar a mano.
      setCopied(false);
    }
  }

  return (
    <li className="rounded-xl border border-tangerine/30 bg-tangerine/[0.06] p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <span className="h-2 w-2 shrink-0 rounded-full bg-tangerine" />
        Enlace pendiente
        {inv.email && (
          <span className="font-normal text-ink-soft">· {inv.email}</span>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs text-ink-soft">
          {path}
        </code>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-full bg-pitch px-3.5 py-2 text-xs font-semibold text-chalk transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <form action={revokeGuardianInvitation}>
            <input type="hidden" name="invitationId" value={inv.id} />
            <input type="hidden" name="studentId" value={studentId} />
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-ink/15 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition hover:border-red-300 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              Revocar
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
