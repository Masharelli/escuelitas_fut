import { getGuardianMembership } from "@/lib/guardians";
import { getUnreadCount } from "@/lib/notifications";
import { PortalShell, type NavItem } from "@/components/portal-shell";

const NAV: NavItem[] = [
  { href: "/padres", label: "Inicio", icon: "home" },
  { href: "/padres/hijos", label: "Mis hijos", icon: "kids" },
  { href: "/padres/pagos", label: "Pagos", icon: "payments" },
  { href: "/padres/partidos", label: "Partidos", icon: "matches" },
  { href: "/padres/entrenamientos", label: "Entrenamientos", icon: "calendar" },
];

export default async function PadresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session: active, membership, all } = await getGuardianMembership();
  const unread = await getUnreadCount(active.user.id);

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Portal de padres"
      userName={active.user.name}
      nav={NAV}
      schools={all.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
      notifications={{ href: "/padres/avisos", unread }}
    >
      {children}
    </PortalShell>
  );
}
