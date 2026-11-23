"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { sendTeamNotice } from "./notice-actions";

export function TeamNoticeForm({ teamId, guardians }: { teamId: string; guardians: { id: string; name: string | null; email: string | null }[] }) {
  const [state, action] = useActionState(sendTeamNotice, undefined);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="teamId" value={teamId} />
    <label className="block text-sm text-ink-soft">Destinatario<select name="recipientId" className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink"><option value="">Todos los tutores del equipo</option>{guardians.map((g) => <option key={g.id} value={g.id}>{g.name ?? g.email ?? "Tutor"}</option>)}</select></label>
    <label className="block text-sm text-ink-soft">Título<input name="title" required maxLength={120} className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink" /></label>
    <label className="block text-sm text-ink-soft">Mensaje<textarea name="body" required maxLength={2000} rows={4} className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink" /></label>
    {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    {state?.ok && <p role="status" className="text-sm text-pitch">Aviso enviado al portal de los tutores.</p>}
    {guardians.length > 0 ? <SubmitButton>Enviar aviso</SubmitButton> : <p className="text-sm text-ink-soft">Invita primero a los tutores desde la administración de alumnos.</p>}
  </form>;
}
