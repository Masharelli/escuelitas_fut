"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon =
  | "home"
  | "students"
  | "teams"
  | "payments"
  | "finance"
  | "matches"
  | "trophy"
  | "attendance"
  | "calendar"
  | "kids"
  | "school";

export type NavItem = { href: string; label: string; icon: NavIcon };

const ICONS: Record<NavIcon, React.ReactNode> = {
  home: (
    <path
      d="M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  students: (
    <>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17.5 19c0-2.2-1-3.8-2.5-4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  teams: (
    <path
      d="M12 3 5 5.5V11c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V5.5L12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 14.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  matches: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4l4-2.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  finance: (
    <>
      <path
        d="M4 20V10M9 20V5M14 20v-7M19 20V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M3 20h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  trophy: (
    <>
      <path
        d="M7 4h10v3a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4.5v1.5A2.5 2.5 0 0 0 7 9M17 5h2.5v1.5A2.5 2.5 0 0 1 17 9M9.5 13.5h5M12 12v1.5M9 20h6M10 17h4l.5 3h-5l.5-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  kids: (
    <>
      <circle cx="12" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  school: (
    <path
      d="M4 20V9l8-5 8 5v11M9 20v-5h6v5M4 20h16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  attendance: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 11.5l2.2 2.2L16 8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 9.5h16M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
};

function isActive(pathname: string, href: string) {
  // El "Inicio" de cada portal solo está activo en coincidencia exacta;
  // las demás secciones, también en sus subrutas.
  const isPortalRoot = href === "/admin" || href === "/padres";
  return isPortalRoot ? pathname === href : pathname.startsWith(href);
}

export function PortalNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-pitch/10 text-pitch"
                : "text-ink-soft hover:bg-chalk-deep hover:text-ink"
            }`}
          >
            <Glyph icon={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Glyph({ icon }: { icon: NavIcon }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {ICONS[icon]}
    </svg>
  );
}
