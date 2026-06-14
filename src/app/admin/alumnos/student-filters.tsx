"use client";

import { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

export function StudentFilters({
  categories,
  teams,
}: {
  categories: Option[];
  teams: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const onSearch = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply("q", value.trim()), 350);
  };

  const hasFilters = !!(sp.get("q") || sp.get("cat") || sp.get("team"));

  const selectClass =
    "rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20";

  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nombre o apellido…"
          className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-3 text-sm text-ink shadow-sm outline-none placeholder:text-ink-soft/60 focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
      </div>
      <select
        defaultValue={sp.get("cat") ?? ""}
        onChange={(e) => apply("cat", e.target.value)}
        className={selectClass}
        aria-label="Filtrar por categoría"
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <select
        defaultValue={sp.get("team") ?? ""}
        onChange={(e) => apply("team", e.target.value)}
        className={selectClass}
        aria-label="Filtrar por equipo"
      >
        <option value="">Todos los equipos</option>
        {teams.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
