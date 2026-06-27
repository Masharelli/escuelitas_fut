import { requireRole } from "@/lib/tenant";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default async function CoachAvisosPage() {
  const { session } = await requireRole(["coach"]);
  return <NotificationsView userId={session.user.id} />;
}
