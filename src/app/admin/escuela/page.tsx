import { getActiveMembership } from "@/lib/tenant";
import { EscuelaForm } from "./escuela-form";

export default async function EscuelaPage() {
  const { membership } = await getActiveMembership();
  return <EscuelaForm school={membership.school} />;
}
