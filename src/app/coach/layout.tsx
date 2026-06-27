import { requireRole } from "@/lib/tenant";
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
  const { session, membership, candidates } = await requireRole(["coach"]);
  const unread = await getUnreadCount(session.user.id);

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Portal de entrenador"
      userName={session.user.name}
      nav={NAV}
      schools={candidates.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
      notifications={{ href: "/coach/avisos", unread }}
    >
      {children}
    </PortalShell>
  );
}
