import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { PortalShell } from "@/components/portal-shell";

const NAV = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/equipos", label: "Equipos" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/partidos", label: "Partidos" },
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
