import Link from "next/link";

/** Campana de avisos con contador de no leídos. Lleva a la lista de avisos. */
export function NotificationBell({
  href,
  unread,
}: {
  href: string;
  unread: number;
}) {
  return (
    <Link
      href={href}
      aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : "Avisos"}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-chalk-deep hover:text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 9a6 6 0 0 1 12 0c0 3.6 1 5 1.8 5.7.5.4.2 1.3-.5 1.3H4.7c-.7 0-1-.9-.5-1.3C5 14 6 12.6 6 9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M10 19a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tangerine px-1 text-[10px] font-bold leading-none text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
