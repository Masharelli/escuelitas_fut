"use client";

import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/portal/notification-bell";
import { PortalNav, type NavItem } from "@/components/portal/portal-nav";
import {
  SchoolSwitcher,
  type SwitchableSchool,
} from "@/components/portal/school-switcher";

/**
 * Navegación móvil con menú hamburguesa + panel lateral deslizable. Sustituye
 * al carrusel horizontal: un toque en ☰ abre un panel con TODAS las secciones,
 * el selector de escuela y el cierre de sesión. Se cierra solo al navegar, al
 * tocar fuera o con Escape.
 */
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
  const canSwitch = !!schools && schools.length > 1 && !!activeSchoolId;

  // Bloquea el scroll del fondo y permite cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Barra superior */}
      <header className="flex items-center justify-between border-b border-ink/10 bg-white/70 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition hover:bg-chalk-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <Wordmark size="md" />
        </div>
        <div className="flex items-center gap-1">
          {notifications && (
            <NotificationBell
              href={notifications.href}
              unread={notifications.unread}
            />
          )}
          <LogoutButton compact />
        </div>
      </header>

      {/* Panel lateral + fondo */}
      <div
        className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-white px-4 py-5 shadow-xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Wordmark size="md" href={null} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-chalk-deep hover:text-ink"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl bg-chalk-deep/70 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pitch font-display text-base font-extrabold text-chalk">
              {schoolName.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {schoolName}
              </p>
              <p className="text-xs font-medium text-pitch">{portalLabel}</p>
            </div>
          </div>

          {canSwitch && (
            <SchoolSwitcher schools={schools} activeId={activeSchoolId} />
          )}

          {/* Cierra el panel al tocar una sección (los hijos son enlaces). */}
          <div
            className="mt-5 flex-1 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <PortalNav items={nav} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink/10 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">
                {(userName ?? "?").trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="truncate text-sm text-ink-soft">
                {userName ?? "Mi cuenta"}
              </span>
            </div>
            <LogoutButton compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
