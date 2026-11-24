"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalIcon, type NavIcon } from "./portal-icon";

export type NavItem = { href: string; label: string; icon: NavIcon };

function isActive(pathname: string, href: string) {
  if (href === "/coach") {
    return pathname === href || (
      pathname.startsWith("/coach/") &&
      pathname !== "/coach/avisos" &&
      !pathname.startsWith("/coach/avisos/")
    );
  }
  if (href === "/admin" || href === "/padres") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav({ items, bottom = false }: { items: NavItem[]; bottom?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={bottom ? "Accesos principales" : "Secciones del portal"}
      className={bottom
        ? "fixed inset-x-0 bottom-0 z-30 flex items-start border-t border-outline-variant bg-surface-container px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:hidden"
        : "flex flex-col gap-1 px-1"}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={bottom
              ? `group flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-0.5 text-center text-xs leading-tight ${active ? "font-bold text-on-primary-container" : "font-medium text-ink-soft"}`
              : `flex min-h-12 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-colors ${active ? "bg-primary-container font-bold text-on-primary-container" : "font-medium text-ink-soft hover:bg-chalk-deep hover:text-ink"}`}
          >
            {bottom ? (
              <span className={`flex h-8 w-14 max-w-full items-center justify-center rounded-full transition-colors ${active ? "bg-primary-container" : "group-hover:bg-chalk-deep"}`}>
                <PortalIcon icon={item.icon} size={22} />
              </span>
            ) : (
              <PortalIcon icon={item.icon} size={21} />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
