import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { getUnreadCount } from "@/lib/notifications";
import { hasFeature } from "@/lib/plan";
import { orgVocab } from "@/lib/org";
import { PortalShell, type NavItem } from "@/components/portal-shell";

/** Navegación del panel según el tipo de organización y el plan. */
function buildNav(kind: string, settingsLabel: string, plan: string): NavItem[] {
  if (kind === "league") {
    return [
      { href: "/admin", label: "Inicio", icon: "home" },
      { href: "/admin/liga/equipos", label: "Equipos", icon: "teams" },
      { href: "/admin/liga/temporadas", label: "Temporadas", icon: "trophy" },
      { href: "/admin/escuela", label: settingsLabel, icon: "school" },
    ];
  }
  const nav: NavItem[] = [
    { href: "/admin", label: "Inicio", icon: "home" },
    { href: "/admin/alumnos", label: "Alumnos", icon: "students" },
    { href: "/admin/equipos", label: "Equipos", icon: "teams" },
    { href: "/admin/pagos", label: "Pagos", icon: "payments" },
    { href: "/admin/finanzas", label: "Finanzas", icon: "finance" },
    { href: "/admin/partidos", label: "Partidos", icon: "matches" },
    { href: "/admin/calendario", label: "Calendario", icon: "calendar" },
    { href: "/admin/asistencias", label: "Asistencias", icon: "attendance" },
    { href: "/admin/torneos", label: "Torneos", icon: "trophy" },
  ];
  // Módulo de gastos (Premium).
  if (hasFeature(plan, "expenses")) {
    nav.push({ href: "/admin/gastos", label: "Gastos", icon: "finance" });
  }
  nav.push({ href: "/admin/escuela", label: settingsLabel, icon: "school" });
  return nav;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership, candidates } = await requireRole(ADMIN_ROLES);
  const unread = await getUnreadCount(session.user.id);
  const vocab = orgVocab(membership.school.kind);

  return (
    <PortalShell
      schoolName={membership.school.name}
      portalLabel={vocab.portalLabel}
      userName={session.user.name}
      nav={buildNav(membership.school.kind, vocab.settingsLabel, membership.school.plan)}
      schools={candidates.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
      notifications={{ href: "/admin/avisos", unread }}
    >
      {children}
    </PortalShell>
  );
}
