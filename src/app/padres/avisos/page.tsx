import { requireAuth } from "@/lib/tenant";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default async function PadresAvisosPage() {
  const session = await requireAuth();
  return <NotificationsView userId={session.user.id} />;
}
