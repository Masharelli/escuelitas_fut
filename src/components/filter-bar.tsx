"use client";

import { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

export type SelectFilter = {
  key: string;
  allLabel: string;
  options: Option[];
};

/**
 * Barra de filtros genérica sobre la URL (searchParams): búsqueda con
 * debounce, selector de mes y selects. Aplica al instante con router.replace;
 * "Limpiar" quita SOLO las llaves que maneja esta barra (no toca otras).
 */
export function FilterBar({
  search,
  month,
  selects = [],
}: {
  search?: { key: string; placeholder: string };
  /** defaultValue: lo que muestra el input cuando la URL no trae el parámetro. */
  month?: { key: string; defaultValue?: string };
  selects?: SelectFilter[];
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
    debounce.current = setTimeout(() => apply(search!.key, value.trim()), 350);
  };

  const managedKeys = [
    ...(search ? [search.key] : []),
    ...(month ? [month.key] : []),
    ...selects.map((s) => s.key),
  ];
  const hasFilters = managedKeys.some((k) => sp.get(k));

  const clear = () => {
    const params = new URLSearchParams(sp.toString());
    for (const k of managedKeys) params.delete(k);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const fieldClass =
    "min-h-11 w-full min-w-0 rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20 sm:w-auto sm:flex-[1_1_11rem]";

  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-center gap-2">
      {search && (
        <div className="relative min-w-0 flex-[1_1_100%] xl:flex-[2_1_14rem]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            defaultValue={sp.get(search.key) ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="min-h-11 w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-3 text-sm text-ink shadow-sm outline-none placeholder:text-ink-soft/60 focus:border-pitch focus:ring-2 focus:ring-pitch/20"
          />
        </div>
      )}
      {month && (
        <input
          type="month"
          defaultValue={sp.get(month.key) ?? month.defaultValue ?? ""}
          onChange={(e) => apply(month.key, e.target.value)}
          aria-label="Filtrar por mes"
          className={fieldClass}
        />
      )}
      {selects.map((s) => (
        <select
          key={s.key}
          defaultValue={sp.get(s.key) ?? ""}
          onChange={(e) => apply(s.key, e.target.value)}
          className={fieldClass}
          aria-label={s.allLabel}
        >
          <option value="">{s.allLabel}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="min-h-11 shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-chalk-deep hover:text-ink"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
