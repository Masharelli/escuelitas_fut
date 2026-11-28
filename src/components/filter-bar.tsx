"use client";

import { startTransition, useEffect, useOptimistic, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PortalIcon, type NavIcon } from "@/components/portal/portal-icon";
import styles from "@/components/form/select-styles.module.css";

type Option = { value: string; label: string };

export type SelectFilter = {
  key: string;
  label: string;
  allLabel: string;
  icon: NavIcon;
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
  search?: { key: string; placeholder: string; grouped?: boolean };
  /** defaultValue: lo que muestra el input cuando la URL no trae el parámetro. */
  month?: { key: string; defaultValue?: string };
  selects?: SelectFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useOptimistic(sp.toString());
  const queryRef = useRef(query);
  const currentFilters = new URLSearchParams(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const replaceFilters = (params: URLSearchParams) => {
    const nextQuery = params.toString();
    queryRef.current = nextQuery;
    startTransition(() => {
      setQuery(nextQuery);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  };

  const apply = (key: string, value: string) => {
    const params = new URLSearchParams(queryRef.current);
    if (value) params.set(key, value);
    else params.delete(key);
    replaceFilters(params);
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
  const hasFilters = managedKeys.some((k) => currentFilters.get(k));
  const searchField = useRef<HTMLInputElement>(null);

  const clear = () => {
    if (debounce.current) clearTimeout(debounce.current);
    if (searchField.current) searchField.current.value = "";
    const params = new URLSearchParams(queryRef.current);
    for (const k of managedKeys) params.delete(k);
    replaceFilters(params);
  };

  const searchControl = search && (
    <div className={search.grouped ? styles.filterSearch : "relative min-w-0 flex-[1_1_100%]"}>
      <svg
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
        width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={searchField}
        type="search"
        defaultValue={sp.get(search.key) ?? ""}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={search.placeholder}
        aria-label={search.placeholder}
        className="md-field pl-10 sm:text-sm"
      />
    </div>
  );

  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-center gap-2 @container">
      {!search?.grouped && searchControl}
      {(search?.grouped || month || selects.length > 0) && (
        <div
          role="group"
          aria-label={search?.grouped ? "Búsqueda y filtros" : "Filtros"}
          className={search?.grouped ? `${styles.filterGroup} ${styles.filterGroupWithSearch}` : styles.filterGroup}
        >
          {search?.grouped && searchControl}
          {month && (
            <div className={styles.filterSegment} data-active={currentFilters.get(month.key) ? "" : undefined}>
              <input
                type="month"
                value={currentFilters.get(month.key) ?? month.defaultValue ?? ""}
                onChange={(e) => apply(month.key, e.target.value)}
                aria-label="Filtrar por mes"
              />
            </div>
          )}
          {selects.map((s) => {
            const value = currentFilters.get(s.key) ?? "";
            return (
              <div key={s.key} className={styles.filterSegment} data-active={value ? "" : undefined}>
                <span className={styles.filterIcon}><PortalIcon icon={s.icon} size={18} /></span>
                <select data-filter-field value={value} onChange={(e) => apply(s.key, e.target.value)} aria-label={s.label}>
                  <option value="">{s.allLabel}</option>
                  {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="md-button md-tonal"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
