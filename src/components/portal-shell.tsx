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
  schools,
  activeSchoolId,
  notifications,
  children,
}: {
  schoolName: string;
  portalLabel: string;
  userName?: string | null;
  nav: NavItem[];
  /** Escuelas entre las que puede cambiar el usuario en este portal. */
  schools?: SwitchableSchool[];
  activeSchoolId?: string;
  /** Campana de avisos: ruta de la lista y número de no leídos. */
  notifications?: { href: string; unread: number };
  children: React.ReactNode;
}) {
  const canSwitch = !!schools && schools.length > 1 && !!activeSchoolId;
  return (
    <div className="flex w-full min-w-0 flex-1 bg-chalk text-ink">
      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col self-start border-r border-ink/10 bg-white/70 px-4 py-5 lg:flex lg:w-56 xl:w-64">
        <div className="px-2">
          <Wordmark size="md" />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-chalk-deep/70 px-3 py-2.5">
          <SchoolAvatar name={schoolName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{schoolName}</p>
            <p className="text-xs font-medium text-pitch">{portalLabel}</p>
          </div>
          {notifications && (
            <NotificationBell
              href={notifications.href}
              unread={notifications.unread}
            />
          )}
        </div>

        {canSwitch && (
          <SchoolSwitcher schools={schools} activeId={activeSchoolId} />
        )}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
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

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">{children}</main>
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
