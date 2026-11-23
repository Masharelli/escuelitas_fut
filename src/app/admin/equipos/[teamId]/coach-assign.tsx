"use client";

import { useActionState, useState } from "react";

import {
  inviteCoach,
  revokeCoachInvitation,
  unassignCoach,
  type FormState,
} from "../actions";
import { SubmitButton } from "@/components/submit-button";

type Coach = { id: string; user: { name: string | null; email: string | null } };
type Invitation = {
  id: string;
  token: string;
  email: string | null;
  status: "pending" | "accepted" | "revoked";
  acceptedByName: string | null;
};

export function CoachAssign({
  teamId,
  coaches,
  invitations,
}: {
  teamId: string;
  coaches: Coach[];
  invitations: Invitation[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    inviteCoach,
    undefined
  );
  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-bold">Entrenadores</h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Usa el mismo correo para asignar a un entrenador a varios equipos o categorías.
        Si es nuevo en la escuela, comparte el enlace de invitación.
      </p>

      {coaches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {coaches.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-chalk-deep/30 px-3.5 py-2.5"
            >
              <span className="min-w-0 truncate text-sm">
                <span className="font-medium text-ink">
                  {c.user.name ?? c.user.email ?? "Entrenador"}
                </span>
                {c.user.name && c.user.email && (
                  <span className="text-ink-soft"> · {c.user.email}</span>
                )}
              </span>
              <form action={unassignCoach}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="teamId" value={teamId} />
                <button
                  type="submit"
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
                >
                  Quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((i) => (
            <InvitationRow key={i.id} invitation={i} teamId={teamId} />
          ))}
        </ul>
      )}

      <form action={action} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input type="hidden" name="teamId" value={teamId} />
        <label className="min-w-0">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Correo del entrenador
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="entrenador@correo.com"
            className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
          />
        </label>
        <SubmitButton inline>Asignar o invitar</SubmitButton>
      </form>
      {state?.ok && (
        <p role="status" className="mt-2 text-sm text-pitch">
          {state.assigned ? "Entrenador asignado a este equipo." : "Enlace de invitación generado."}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}

function InvitationRow({
  invitation: i,
  teamId,
}: {
  invitation: Invitation;
  teamId: string;
}) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/invitacion-coach/${i.token}`
      : `/invitacion-coach/${i.token}`;

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-ink/20 bg-white px-3.5 py-2.5">
      <span className="min-w-0 truncate text-sm text-ink-soft">
        Pendiente{i.email ? ` · ${i.email}` : ""}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(link);
            setCopied(true);
          }}
          className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-chalk-deep"
        >
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <form action={revokeCoachInvitation}>
          <input type="hidden" name="id" value={i.id} />
          <input type="hidden" name="teamId" value={teamId} />
          <button
            type="submit"
            className="rounded-full px-2 py-1 text-xs font-medium text-ink-soft transition hover:bg-red-50 hover:text-red-600"
          >
            Revocar
          </button>
        </form>
      </div>
    </li>
  );
}
