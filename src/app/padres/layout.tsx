import { getActiveMembership } from "@/lib/tenant";
import { PortalShell } from "@/components/portal-shell";

const NAV = [
  { href: "/padres", label: "Inicio" },
  { href: "/padres/hijos", label: "Mis hijos" },
  { href: "/padres/pagos", label: "Pagos" },
  { href: "/padres/partidos", label: "Partidos" },
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
