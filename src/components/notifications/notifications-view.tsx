import Link from "next/link";

import { getMyNotifications, type NotificationType } from "@/lib/notifications";
import { PageHeader, EmptyState } from "@/components/ui";
import { MarkReadOnView } from "./mark-read";

/** Acento de color por tipo de aviso. */
const TYPE_ACCENT: Record<NotificationType, string> = {
  charge_created: "bg-tangerine",
  charge_paid: "bg-pitch",
  charge_due_soon: "bg-tangerine",
  charge_overdue: "bg-red-500",
  match_upcoming: "bg-sky-500",
  match_result: "bg-pitch",
  general: "bg-ink/30",
};

/** "hace un momento" / fecha corta es-MX. */
function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days <= 7) return `hace ${days} día${days === 1 ? "" : "s"}`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Lista de avisos del usuario. Al abrirla se marcan como leídos (limpia la
 * campana). Compartida por el portal de admin y el de padres.
 */
export async function NotificationsView({ userId }: { userId: string }) {
  const items = await getMyNotifications(userId);
  const hasUnread = items.some((i) => !i.readAt);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        eyebrow="Avisos"
        title="Avisos"
        subtitle="Cuotas, pagos y resultados de tus partidos."
      />

      <MarkReadOnView hasUnread={hasUnread} />

      {items.length === 0 ? (
        <EmptyState
          title="Sin avisos por ahora"
          description="Aquí llegarán las cuotas nuevas, los pagos recibidos y los resultados de los partidos."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const unread = !n.readAt;
            const row = (
              <div
                className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm transition ${
                  unread
                    ? "border-pitch/25 bg-pitch/[0.04]"
                    : "border-ink/10 bg-white/80"
                } ${n.link ? "hover:border-pitch/40" : ""}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    TYPE_ACCENT[n.type as NotificationType] ?? "bg-ink/30"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="text-sm text-ink-soft">{n.body}</p>
                  <p className="mt-0.5 text-xs text-ink-soft/70">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {unread && (
                  <span className="mt-1 shrink-0 rounded-full bg-tangerine/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tangerine">
                    Nuevo
                  </span>
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="block">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
