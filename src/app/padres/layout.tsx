import { getActiveMembership } from "@/lib/tenant";
import { PortalShell, type NavItem } from "@/components/portal-shell";

const NAV: NavItem[] = [
  { href: "/padres", label: "Inicio", icon: "home" },
  { href: "/padres/hijos", label: "Mis hijos", icon: "kids" },
  { href: "/padres/pagos", label: "Pagos", icon: "payments" },
  { href: "/padres/partidos", label: "Partidos", icon: "matches" },
];

export default async function PadresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await getActiveMembership();

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Portal de padres"
      userName={session.user.name}
      nav={NAV}
    >
      {children}
    </PortalShell>
  );
}
