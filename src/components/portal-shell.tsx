import { Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/logout-button";
import { PortalNav, type NavItem } from "@/components/portal/portal-nav";
import {
  SchoolSwitcher,
  type SwitchableSchool,
} from "@/components/portal/school-switcher";

export type { NavItem };

export function PortalShell({
  schoolName,
  portalLabel,
  userName,
  nav,
  schools,
  activeSchoolId,
  children,
}: {
  schoolName: string;
  portalLabel: string;
  userName?: string | null;
  nav: NavItem[];
  /** Escuelas entre las que puede cambiar el usuario en este portal. */
  schools?: SwitchableSchool[];
  activeSchoolId?: string;
  children: React.ReactNode;
}) {
  const canSwitch = !!schools && schools.length > 1 && !!activeSchoolId;
  return (
    <div className="flex w-full min-w-0 flex-1 bg-chalk text-ink">
      {/* Menú lateral (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink/10 bg-white/70 px-4 py-6 md:flex">
        <div className="px-2">
          <Wordmark size="md" />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-chalk-deep/70 px-3 py-2.5">
          <SchoolAvatar name={schoolName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{schoolName}</p>
            <p className="text-xs font-medium text-pitch">{portalLabel}</p>
          </div>
        </div>

        {canSwitch && (
          <SchoolSwitcher schools={schools} activeId={activeSchoolId} />
        )}

        <div className="mt-6 flex-1">
          <PortalNav items={nav} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-ink/10 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={userName} />
            <span className="truncate text-sm text-ink-soft">
              {userName ?? "Mi cuenta"}
            </span>
          </div>
          <LogoutButton compact />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil) */}
        <header className="flex items-center justify-between border-b border-ink/10 bg-white/70 px-4 py-3 backdrop-blur md:hidden">
          <Wordmark size="md" />
          <LogoutButton compact />
        </header>
        <div className="border-b border-ink/10 bg-white/40 pt-3 md:hidden">
          {canSwitch ? (
            <div className="px-4 pb-2">
              <SchoolSwitcher schools={schools} activeId={activeSchoolId} />
              <p className="mt-1.5 text-xs font-medium text-pitch">
                {portalLabel}
              </p>
            </div>
          ) : (
            <p className="px-4 pb-2 text-xs font-medium text-pitch">
              {schoolName} · {portalLabel}
            </p>
          )}
          <PortalNav items={nav} variant="scroller" />
        </div>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SchoolAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pitch font-display text-base font-extrabold text-chalk">
      {initial(name)}
    </span>
  );
}

function UserAvatar({ name }: { name?: string | null }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">
      {initial(name ?? "?")}
    </span>
  );
}

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}
