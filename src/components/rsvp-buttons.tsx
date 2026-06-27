import { respondCallup } from "@/app/padres/callups-actions";

type Rsvp = "pending" | "yes" | "no";

const base =
  "rounded-full px-3 py-1 text-xs font-semibold transition border";
const idle = "border-ink/15 bg-white text-ink-soft hover:text-ink";
const activeYes = "border-pitch bg-pitch/10 text-pitch";
const activeNo = "border-red-300 bg-red-50 text-red-600";

/**
 * Botones de confirmación de asistencia para el tutor (asistirá / no asistirá).
 * Resalta la opción elegida. Cada botón envía la acción del servidor.
 */
export function RsvpButtons({
  callupId,
  rsvp,
  studentName,
}: {
  callupId: string;
  rsvp: Rsvp;
  studentName?: string;
}) {
  return (
    <form action={respondCallup} className="flex items-center gap-1.5">
      <input type="hidden" name="callupId" value={callupId} />
      {studentName && (
        <span className="mr-1 text-xs text-ink-soft">{studentName}:</span>
      )}
      <button
        type="submit"
        name="rsvp"
        value="yes"
        className={`${base} ${rsvp === "yes" ? activeYes : idle}`}
      >
        Asistirá
      </button>
      <button
        type="submit"
        name="rsvp"
        value="no"
        className={`${base} ${rsvp === "no" ? activeNo : idle}`}
      >
        No asistirá
      </button>
    </form>
  );
}
