import { getActiveMembership } from "@/lib/tenant";
import { getMyChildrenSessions } from "@/lib/guardians";
import { getMyChildrenCallups, type RsvpStatus } from "@/lib/callups";
import { formatKickoff } from "@/lib/competition";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function PadresEntrenamientosPage() {
  const { session } = await getActiveMembership();
  const [sessions, callups] = await Promise.all([
    getMyChildrenSessions(session.user.id),
    getMyChildrenCallups(session.user.id),
  ]);

  // Convocatorias por sesión: { callupId, studentName, rsvp } por sessionId.
  const callupsBySession = new Map<
    string,
    { callupId: string; studentName: string; rsvp: RsvpStatus }[]
  >();
  for (const c of callups) {
    if (!c.sessionId) continue;
    const list = callupsBySession.get(c.sessionId) ?? [];
    list.push({
      callupId: c.id,
      studentName: c.student.firstName,
      rsvp: c.rsvp as RsvpStatus,
    });
    callupsBySession.set(c.sessionId, list);
  }

  const now = new Date().getTime();
  const upcoming = sessions
    .filter((s) => s.startsAt.getTime() >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = sessions
    .filter((s) => s.startsAt.getTime() < now)
    .slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Entrenamientos"
        title="Entrenamientos"
        subtitle="Horarios de entrenamientos y eventos del equipo de tus hijos."
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Sin entrenamientos por ahora"
          description="Cuando la escuela programe entrenamientos del equipo de tu hijo, aparecerán aquí."
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg font-bold">Próximos</h2>
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    callups={callupsBySession.get(s.id)}
                  />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg font-bold">Anteriores</h2>
              <ul className="space-y-2">
                {past.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type Row = {
  id: string;
  title: string;
  kind: string;
  startsAt: Date;
  location: string | null;
  team: { name: string };
};

function SessionRow({
  session: s,
  callups,
}: {
  session: Row;
  callups?: { callupId: string; studentName: string; rsvp: string }[];
}) {
  return (
    <li className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">
          {s.title} <span className="text-ink-soft">· {s.team.name}</span>
        </p>
        <p className="truncate text-xs text-ink-soft">
          {SESSION_KIND_LABELS[s.kind as SessionKind]} ·{" "}
          {formatKickoff(s.startsAt)}
          {s.location ? ` · ${s.location}` : ""}
        </p>
      </div>
      {callups && callups.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-ink/10 pt-3">
          <p className="text-xs font-medium text-ink-soft">
            Convocado · confirma asistencia
          </p>
          {callups.map((c) => (
            <RsvpButtons
              key={c.callupId}
              callupId={c.callupId}
              rsvp={c.rsvp as RsvpStatus}
              studentName={c.studentName}
            />
          ))}
        </div>
      )}
    </li>
  );
}
