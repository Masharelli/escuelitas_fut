import Link from "next/link";

import { LogoutButton } from "./logout-button";

export type NavItem = { href: string; label: string };

export function PortalShell({
  schoolName,
  portalLabel,
  userName,
  nav,
  children,
}: {
  schoolName: string;
  portalLabel: string;
  userName?: string | null;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 sm:flex">
        <div className="px-2">
          <p className="text-sm font-semibold text-slate-900">{schoolName}</p>
          <p className="text-xs text-emerald-600">{portalLabel}</p>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm font-medium text-slate-700 sm:hidden">
            {schoolName}
          </span>
          <div className="ml-auto flex items-center gap-4">
            {userName && (
              <span className="text-sm text-slate-500">{userName}</span>
            )}
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
