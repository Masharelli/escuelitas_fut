import Link from "next/link";

import { PortalIcon } from "./portal-icon";

export function NotificationBell({ href, unread }: { href: string; unread: number }) {
  return (
    <Link
      href={href}
      aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : "Avisos"}
      className="md-icon-button relative"
    >
      <PortalIcon icon="notifications" size={22} />
      {unread > 0 && (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#a83916] px-1 text-[10px] font-bold leading-none text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
