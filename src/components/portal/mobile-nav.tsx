"use client";

import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/portal/notification-bell";
import { PortalNav, type NavItem } from "@/components/portal/portal-nav";
import {
  SchoolSwitcher,
  type SwitchableSchool,
} from "@/components/portal/school-switcher";

export function MobileNav({
  schoolName,
  portalLabel,
  userName,
  nav,
  schools,
  activeSchoolId,
  notifications,
}: {
  schoolName: string;
  portalLabel: string;
  userName?: string | null;
  nav: NavItem[];
  schools?: SwitchableSchool[];
  activeSchoolId?: string;
  notifications?: { href: string; unread: number };
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const canSwitch = !!schools && schools.length > 1 && !!activeSchoolId;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onResize = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  return (
    <div className="lg:hidden">
      <header className="flex min-h-16 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container px-2 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="portal-menu"
          className="md-icon-button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base font-bold leading-tight" title={schoolName}>{schoolName}</p>
          <p className="mt-0.5 text-xs leading-tight text-ink-soft">{portalLabel}</p>
        </div>
        {notifications && (
          <NotificationBell href={notifications.href} unread={notifications.unread} />
        )}
      </header>

      <dialog
        ref={dialog}
        id="portal-menu"
        aria-label="Menú de navegación"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-ink/45"
      >
        <div className="flex h-full w-[min(88%,21rem)] flex-col overflow-hidden rounded-r-[1.75rem] bg-surface-container px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Wordmark size="md" href={null} />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar menú"
              className="md-icon-button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
            <div className="mb-3 rounded-2xl bg-surface px-4 py-3">
              <p className="text-sm font-semibold">{schoolName}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{portalLabel}</p>
            </div>
            {canSwitch && <SchoolSwitcher schools={schools} activeId={activeSchoolId} />}

            <div
              className="mt-3"
              onClick={(event) => {
                if ((event.target as Element).closest("a")) dialog.current?.close();
              }}
            >
              <PortalNav items={nav} />
            </div>
          </div>

          <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-outline-variant px-2 pt-2">
            <span className="truncate text-sm font-medium text-ink-soft">{userName ?? "Mi cuenta"}</span>
            <LogoutButton compact />
          </div>
        </div>
      </dialog>
    </div>
  );
}
