import { ADMIN_ROLES, requireRole } from "@/lib/tenant";
import { getUnreadCount } from "@/lib/notifications";
import { PortalShell, type NavItem } from "@/components/portal-shell";

const NAV: NavItem[] = [
  { href: "/coach", label: "Mis equipos", icon: "teams" },
  { href: "/coach/avisos", label: "Avisos", icon: "home" },
];

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership, candidates, all } = await requireRole(["coach"]);
  const unread = await getUnreadCount(session.user.id);
  const canAdmin = all.some((m) => m.schoolId === membership.schoolId && ADMIN_ROLES.includes(m.role));
  const nav: NavItem[] = canAdmin ? [...NAV, { href: "/admin", label: "Administración", icon: "school" }] : NAV;

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Portal de entrenador"
      userName={session.user.name}
      nav={nav}
      schools={candidates.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
      notifications={{ href: "/coach/avisos", unread }}
    >
      {children}
    </PortalShell>
  );
}
