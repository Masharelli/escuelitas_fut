"use client";

import { useActionState } from "react";

import { saveCallups, type FormState } from "@/app/admin/callups-actions";
import { SubmitButton } from "@/components/submit-button";

type Rsvp = "pending" | "yes" | "no";

type Player = {
  id: string;
  name: string;
  convoked: boolean;
  rsvp: Rsvp;
};

const RSVP_BADGE: Record<Rsvp, { label: string; cls: string }> = {
  yes: { label: "Asistirá", cls: "bg-pitch/10 text-pitch" },
  no: { label: "No asistirá", cls: "bg-red-50 text-red-600" },
  pending: { label: "Pendiente", cls: "bg-chalk-deep text-ink-soft" },
};

export function CallupManager({
  target,
  targetId,
  players,
}: {
  target: "match" | "session";
  targetId: string;
  players: Player[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveCallups,
    undefined
  );

  const convoked = players.filter((p) => p.convoked);
  const summary = {
    yes: convoked.filter((p) => p.rsvp === "yes").length,
    no: convoked.filter((p) => p.rsvp === "no").length,
    pending: convoked.filter((p) => p.rsvp === "pending").length,
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="targetId" value={targetId} />

      {convoked.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-pitch/10 px-2.5 py-0.5 font-medium text-pitch">
            {summary.yes} asistirán
          </span>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-medium text-red-600">
            {summary.no} no
          </span>
          <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 font-medium text-ink-soft">
            {summary.pending} sin responder
          </span>
        </div>
      )}

      <ul className="divide-y divide-ink/10">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <label className="flex min-w-0 flex-1 items-center gap-2.5">
              <input
                type="checkbox"
                name="studentIds"
                value={p.id}
                defaultChecked={p.convoked}
                className="h-4 w-4 shrink-0 rounded border-ink/30 text-pitch focus:ring-pitch/30"
              />
              <span className="min-w-0 truncate text-sm text-ink">{p.name}</span>
            </label>
            {p.convoked && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RSVP_BADGE[p.rsvp].cls}`}
              >
                {RSVP_BADGE[p.rsvp].label}
              </span>
            )}
          </li>
        ))}
      </ul>

      {state?.ok && (
        <p className="text-sm text-pitch">Convocatoria guardada ✓</p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Guardar convocatoria</SubmitButton>
    </form>
  );
}
