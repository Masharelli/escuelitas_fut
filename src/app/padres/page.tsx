import Link from "next/link";

import { getActiveMembership } from "@/lib/tenant";
import { getMyChildren } from "@/lib/guardians";
import { EmptyState } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";
import { ChildrenGrid } from "./children-grid";

export default async function PadresHomePage() {
  const { session } = await getActiveMembership();
  const firstName = session.user.name?.trim().split(/\s+/)[0];
  const children = await getMyChildren(session.user.id);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="pitch-panel rounded-[1.75rem] bg-primary-container p-5 text-on-primary-container sm:px-8 sm:py-7">
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {firstName ? `Hola, ${firstName}` : "Inicio"}
        </h1>
        {children.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/padres/pagos" className="md-button bg-surface text-pitch hover:bg-chalk-deep">
              <PortalIcon icon="payments" size={19} /> Ver pagos
            </Link>
            <Link href="/padres/entrenamientos" className="md-button text-on-primary-container hover:bg-chalk-deep">
              <PortalIcon icon="calendar" size={19} /> Entrenamientos
            </Link>
          </div>
        )}
      </header>

      <section className="mt-6" aria-label="Mis hijos">
        {children.length === 0 ? (
          <EmptyState
            icon={<PortalIcon icon="kids" />}
            title="Aún no vemos a tus hijos"
            description="Pide a tu escuela que registre a tu hijo con este mismo correo y aparecerá aquí automáticamente."
          />
        ) : (
          <>
            <h2 className="mb-3 font-display text-xl font-bold">Mis hijos</h2>
            <ChildrenGrid kids={children} />
          </>
        )}
      </section>
    </div>
  );
}
