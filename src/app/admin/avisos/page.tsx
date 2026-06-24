import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default async function AdminAvisosPage() {
  const { session } = await requireRole(ADMIN_ROLES);
  return <NotificationsView userId={session.user.id} />;
}
