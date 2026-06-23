import { auth } from "@/auth";
import { claimStudentsByEmail } from "@/lib/guardians";
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
  // Vincula al usuario con sus hijos por correo (por si la escuela agregó nuevos).
  const session = await auth();
  if (session?.user?.id) {
    await claimStudentsByEmail(session.user.id, session.user.email);
  }

  const { session: active, membership, all } = await getActiveMembership();

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Portal de padres"
      userName={active.user.name}
      nav={NAV}
      schools={all.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
    >
      {children}
    </PortalShell>
  );
}
