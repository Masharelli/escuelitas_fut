"use client";

import { useActionState } from "react";

import { saveAttendance, type FormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import {
  ATTENDANCE_STATUS_OPTIONS,
  type AttendanceStatus,
} from "@/lib/attendance";

type Player = {
  id: string;
  name: string;
  status: AttendanceStatus | string;
  note: string;
};

const selectClass =
  "rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";
const noteClass =
  "w-full rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";

export function AttendanceForm({
  sessionId,
  players,
}: {
  sessionId: string;
  players: Player[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveAttendance,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        type="hidden"
        name="studentIds"
        value={players.map((p) => p.id).join(",")}
      />

      <ul className="divide-y divide-ink/10">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
              {p.name}
            </span>
            <select
              name={`status_${p.id}`}
              defaultValue={p.status}
              className={selectClass}
            >
              {ATTENDANCE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              name={`note_${p.id}`}
              defaultValue={p.note}
              placeholder="Nota (opcional)"
              className={`${noteClass} basis-full sm:basis-48`}
            />
          </li>
        ))}
      </ul>

      {state?.ok && (
        <p className="text-sm text-pitch">Pase de lista guardado ✓</p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton>Guardar pase de lista</SubmitButton>
    </form>
  );
}
