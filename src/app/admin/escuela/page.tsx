import { requireRole, OWNER_ROLES } from "@/lib/tenant";
import { EscuelaForm } from "./escuela-form";

export default async function EscuelaPage() {
  const { membership } = await requireRole(OWNER_ROLES);
  return <EscuelaForm school={membership.school} />;
}
