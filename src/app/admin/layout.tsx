import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { PortalShell, type NavItem } from "@/components/portal-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: "home" },
  { href: "/admin/alumnos", label: "Alumnos", icon: "students" },
  { href: "/admin/equipos", label: "Equipos", icon: "teams" },
  { href: "/admin/pagos", label: "Pagos", icon: "payments" },
  { href: "/admin/partidos", label: "Partidos", icon: "matches" },
  { href: "/admin/escuela", label: "Mi escuela", icon: "school" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await requireRole(ADMIN_ROLES);

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel="Administración"
      userName={session.user.name}
      nav={NAV}
    >
      {children}
    </PortalShell>
  );
}
