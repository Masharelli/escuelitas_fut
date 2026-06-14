"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon =
  | "home"
  | "students"
  | "teams"
  | "payments"
  | "matches"
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
};

function isActive(pathname: string, href: string) {
  // El "Inicio" de cada portal solo está activo en coincidencia exacta;
  // las demás secciones, también en sus subrutas.
  const isPortalRoot = href === "/admin" || href === "/padres";
  return isPortalRoot ? pathname === href : pathname.startsWith(href);
}

export function PortalNav({
  items,
  variant = "sidebar",
}: {
  items: NavItem[];
  variant?: "sidebar" | "scroller";
}) {
  const pathname = usePathname();

  if (variant === "scroller") {
    return (
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-pitch bg-pitch text-chalk"
                  : "border-ink/10 bg-white text-ink-soft hover:text-ink"
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
