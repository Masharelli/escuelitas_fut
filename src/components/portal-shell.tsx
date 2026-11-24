import { Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/portal/notification-bell";
import { MobileNav } from "@/components/portal/mobile-nav";
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
  bottomNav,
  schools,
  activeSchoolId,
  notifications,
  children,
}: {
  schoolName: string;
  portalLabel: string;
  userName?: string | null;
  nav: NavItem[];
  bottomNav?: NavItem[];
  /** Escuelas entre las que puede cambiar el usuario en este portal. */
  schools?: SwitchableSchool[];
  activeSchoolId?: string;
  /** Campana de avisos: ruta de la lista y número de no leídos. */
  notifications?: { href: string; unread: number };
  children: React.ReactNode;
}) {
  const canSwitch = !!schools && schools.length > 1 && !!activeSchoolId;
  return (
    <div className="flex w-full min-w-0 flex-1 bg-chalk text-ink" data-bottom-nav={bottomNav ? "" : undefined}>
      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col self-start border-r border-outline-variant bg-surface-container p-4 lg:flex lg:w-60 xl:w-66">
        <div className="flex shrink-0 items-center justify-between gap-1 px-1">
          <Wordmark size="md" />
          {notifications && <NotificationBell href={notifications.href} unread={notifications.unread} />}
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl bg-surface px-3 py-3">
          <SchoolAvatar name={schoolName} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-tight font-semibold text-ink" title={schoolName}>{schoolName}</p>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">{portalLabel}</p>
          </div>
        </div>

        {canSwitch && (
          <SchoolSwitcher schools={schools} activeId={activeSchoolId} />
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          <PortalNav items={nav} />
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-outline-variant pl-2 pt-2">
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
        {/* Navegación móvil (hamburguesa + panel lateral) */}
        <MobileNav
          schoolName={schoolName}
          portalLabel={portalLabel}
          userName={userName}
          nav={nav}
          schools={schools}
          activeSchoolId={activeSchoolId}
          notifications={notifications}
        />

        <main className={`min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-8 ${bottomNav ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : ""}`}>
          {children}
        </main>
        {bottomNav && <PortalNav items={bottomNav} bottom />}
      </div>
    </div>
  );
}

function SchoolAvatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container font-display text-lg font-extrabold text-on-primary-container">
      {initial(name)}
    </span>
  );
}

function UserAvatar({ name }: { name?: string | null }) {
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chalk-deep text-xs font-semibold text-ink">
      {initial(name ?? "?")}
    </span>
  );
}

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}
