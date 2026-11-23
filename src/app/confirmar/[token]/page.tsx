import { getCallupByToken, RSVP_LABELS, type RsvpStatus } from "@/lib/callups";
import { formatKickoff } from "@/lib/competition";
import { AuthShell } from "@/components/auth-shell";
import { respondAction } from "./actions";

/**
 * Confirmación de asistencia por link mágico (desde WhatsApp, sin login).
 * El token de la URL identifica la convocatoria de UN alumno a UN evento.
 */
export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const callup = await getCallupByToken(token);

  if (!callup) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="Esta convocatoria ya no existe. Pide a la escuela que te reenvíe el enlace."
      >
        <span />
      </AuthShell>
    );
  }

  const event = callup.match ?? callup.session;
  const title = callup.match
    ? `${callup.match.team.name} ${callup.match.isHome ? "vs" : "@"} ${callup.match.opponentName}`
    : (callup.session?.title ?? "Entrenamiento");
  const rsvp = callup.rsvp as RsvpStatus;

  const btn =
    "flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-ink/10 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-pitch">
          Convocatoria
        </p>
        <h1 className="mt-1 font-display text-xl font-extrabold text-ink">
          {title}
        </h1>
        <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
          {callup.match && (
            <p>📅 {formatKickoff(callup.match.kickoffAt)}</p>
          )}
          {callup.session && <p>📅 {formatKickoff(callup.session.startsAt)}</p>}
          {callup.match?.location && <p>📍 {callup.match.location}</p>}
          {callup.match?.mapUrl && (
            <p>
              <a
                href={callup.match.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-pitch hover:underline"
              >
                Ver ubicación en el mapa
              </a>
            </p>
          )}
          {callup.match?.requiredUniform && (
            <p>👕 Uniforme: {callup.match.requiredUniform}</p>
          )}
        </div>

        <p className="mt-5 text-sm text-ink">
          ¿Asistirá{" "}
          <span className="font-semibold">
            {callup.student.firstName} {callup.student.lastName}
          </span>
          ?
        </p>

        {rsvp !== "pending" && (
          <p
            className={`mt-2 rounded-xl px-3 py-2 text-sm font-medium ${
              rsvp === "yes"
                ? "bg-pitch/10 text-pitch"
                : "bg-red-50 text-red-600"
            }`}
          >
            Respuesta actual: {RSVP_LABELS[rsvp]}. Puedes cambiarla abajo.
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <form action={respondAction} className="flex-1">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="rsvp" value="yes" />
            <button
              type="submit"
              className={`${btn} w-full bg-pitch text-chalk hover:bg-pitch-deep`}
            >
              ✅ Sí asistirá
            </button>
          </form>
          <form action={respondAction} className="flex-1">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="rsvp" value="no" />
            <button
              type="submit"
              className={`${btn} w-full border border-ink/15 bg-white text-ink hover:bg-red-50 hover:text-red-600`}
            >
              ❌ No asistirá
            </button>
          </form>
        </div>

        {event && (
          <p className="mt-4 text-center text-xs text-ink-soft">
            Tu respuesta le llega directo al entrenador.
          </p>
        )}
      </div>
    </main>
  );
}
