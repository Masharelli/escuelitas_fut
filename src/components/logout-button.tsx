"use client";

import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
