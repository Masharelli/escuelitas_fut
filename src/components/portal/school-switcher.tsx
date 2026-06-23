"use client";

import { usePathname } from "next/navigation";

import { switchSchool } from "./actions";

export type SwitchableSchool = { id: string; name: string };

/**
 * Selector de escuela activa para usuarios que pertenecen a varias. Al cambiar
 * envía la elección al servidor (cookie) y recarga la misma ruta. Si el usuario
 * sólo tiene una escuela, este componente no se renderiza (lo decide el shell).
 */
export function SchoolSwitcher({
  schools,
  activeId,
}: {
  schools: SwitchableSchool[];
  activeId: string;
}) {
  const pathname = usePathname();

  return (
    <form action={switchSchool} className="mt-3">
      <input type="hidden" name="next" value={pathname} />
      <label className="sr-only" htmlFor="school-switcher">
        Cambiar de escuela
      </label>
      <div className="relative">
        <select
          id="school-switcher"
          name="schoolId"
          defaultValue={activeId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full appearance-none rounded-xl border border-ink/10 bg-white px-3 py-2 pr-8 text-sm font-medium text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/30"
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </form>
  );
}
