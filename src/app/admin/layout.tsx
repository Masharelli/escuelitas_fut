import { requireRole, ADMIN_ROLES, hasCoachAccess } from "@/lib/tenant";
import { getUnreadCount } from "@/lib/notifications";
import { orgVocab } from "@/lib/org";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import selectStyles from "@/components/form/select-styles.module.css";
import buttonStyles from "./button-styles.module.css";

/** Navegación del panel según el tipo de organización y el plan. */
function buildNav(kind: string, settingsLabel: string, role: string): NavItem[] {
  const isOwner = role === "owner";
  if (kind === "league") {
    return [
      { href: "/admin", label: "Inicio", icon: "home" },
      { href: "/admin/liga/equipos", label: "Equipos", icon: "teams" },
      { href: "/admin/liga/temporadas", label: "Temporadas", icon: "trophy" },
      ...(isOwner ? [
        { href: "/admin/movimientos", label: "Movimientos", icon: "finance" as const },
        { href: "/admin/usuarios", label: "Usuarios", icon: "teams" as const },
        { href: "/admin/escuela", label: settingsLabel, icon: "school" as const },
      ] : []),
    ];
  }
  const nav: NavItem[] = [
    { href: "/admin", label: "Inicio", icon: "home" },
    { href: "/admin/alumnos", label: "Alumnos", icon: "students" },
    { href: "/admin/equipos", label: "Equipos", icon: "teams" },
    { href: "/admin/pagos", label: "Pagos", icon: "payments" },
    ...(isOwner ? [{ href: "/admin/cuotas", label: "Cuotas y planes", icon: "calendar" as const }] : []),
    ...(isOwner ? [{ href: "/admin/becas", label: "Becas", icon: "students" as const }] : []),
    ...(isOwner ? [{ href: "/admin/finanzas", label: "Finanzas", icon: "finance" as const }] : []),
    { href: "/admin/partidos", label: "Partidos", icon: "matches" },
    { href: "/admin/calendario", label: "Calendario", icon: "calendar" },
    { href: "/admin/asistencias", label: "Entrenamientos", icon: "attendance" },
    { href: "/admin/torneos", label: "Torneos", icon: "trophy" },
  ];
  nav.push({ href: "/admin/gastos", label: isOwner ? "Egresos" : "Registrar gasto", icon: "finance" });
  if (isOwner) {
    nav.push({ href: "/admin/movimientos", label: "Movimientos", icon: "finance" });
    nav.push({ href: "/admin/usuarios", label: "Usuarios", icon: "teams" });
    nav.push({ href: "/admin/escuela", label: settingsLabel, icon: "school" });
  }
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
  const nav = buildNav(membership.school.kind, vocab.settingsLabel, membership.role);
  if (hasCoachAccess(membership)) {
    nav.push({ href: "/coach", label: "Portal de entrenador", icon: "teams" });
  }

  return (
    <PortalShell
      className={`${selectStyles.admin} ${buttonStyles.adminButtons}`}
      schoolName={membership.school.name}
      portalLabel={vocab.portalLabel}
      userName={session.user.name}
      nav={nav}
      schools={candidates.map((m) => ({ id: m.schoolId, name: m.school.name }))}
      activeSchoolId={membership.schoolId}
      notifications={{ href: "/admin/avisos", unread }}
    >
      {children}
    </PortalShell>
  );
}
