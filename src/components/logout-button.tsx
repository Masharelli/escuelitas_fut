"use client";

import { logout } from "@/app/(auth)/actions";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-chalk-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M10 17l-5-5 5-5M5 12h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {!compact && "Cerrar sesión"}
      </button>
    </form>
  );
}
