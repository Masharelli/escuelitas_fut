import { getGuardianMembership, getMyChildren } from "@/lib/guardians";
import { PageHeader, EmptyState } from "@/components/ui";
import { ChildrenGrid } from "../children-grid";

export default async function MisHijosPage() {
  const { session } = await getGuardianMembership();
  const children = await getMyChildren(session.user.id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Mis hijos"
        title="Mis hijos"
        subtitle={
          children.length
            ? `${children.length} ${children.length === 1 ? "hijo registrado" : "hijos registrados"}.`
            : undefined
        }
      />
      {children.length === 0 ? (
        <EmptyState
          title="Aún no vemos a tus hijos"
          description="Pide a tu escuela un enlace de invitación por cada hijo y acepta todos con la misma cuenta."
        />
      ) : (
        <ChildrenGrid kids={children} />
      )}
    </div>
  );
}
