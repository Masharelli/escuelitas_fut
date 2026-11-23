"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { inviteStaff } from "./actions";

export function StaffInviteForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [role, setRole] = useState("admin");
  const [state, action] = useActionState(inviteStaff, undefined);

  return (
    <form action={action} className="space-y-3">
      <h2 className="font-display text-lg font-bold">Invitar usuario</h2>
      <label className="block text-sm text-ink-soft">
        Rol
        <select name="role" value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink">
          <option value="admin">Administrador</option>
          <option value="coach">Entrenador</option>
        </select>
      </label>
      <p className="text-sm text-ink-soft">
        {role === "coach"
          ? "El entrenador gestiona asistencias, convocatorias y partidos de sus equipos asignados."
          : "El administrador registra pagos, gastos y alumnos. Los precios, becas y finanzas globales quedan reservados al dueño."}
      </p>
      <label className="block text-sm text-ink-soft">
        Correo del usuario
        <input name="email" type="email" required className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink" />
      </label>
      {role === "coach" && (
        <label className="block text-sm text-ink-soft">
          Equipo
          <select name="teamId" required defaultValue="" className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink">
            <option value="" disabled>Selecciona un equipo</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {teams.length === 0 && <span className="mt-1 block">Primero crea un equipo en la sección Equipos.</span>}
        </label>
      )}
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-pitch">Invitación creada. Comparte el enlace de abajo con esa persona.</p>}
      <SubmitButton>Crear invitación</SubmitButton>
    </form>
  );
}
