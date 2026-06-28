import { getActiveMembership } from "@/lib/tenant";
import { getMyChildrenSessions } from "@/lib/guardians";
import { formatKickoff } from "@/lib/competition";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/attendance";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function PadresEntrenamientosPage() {
  const { session } = await getActiveMembership();
  const sessions = await getMyChildrenSessions(session.user.id);

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
                  <SessionRow key={s.id} session={s} />
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

function SessionRow({ session: s }: { session: Row }) {
  return (
    <li className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm">
      <p className="truncate font-semibold text-ink">
        {s.title} <span className="text-ink-soft">· {s.team.name}</span>
      </p>
      <p className="truncate text-xs text-ink-soft">
        {SESSION_KIND_LABELS[s.kind as SessionKind]} ·{" "}
        {formatKickoff(s.startsAt)}
        {s.location ? ` · ${s.location}` : ""}
      </p>
    </li>
  );
}
