import { getActiveMembership } from "@/lib/tenant";
import { getMyChildren } from "@/lib/guardians";
import { EmptyState } from "@/components/ui";
import { ChildrenGrid } from "./children-grid";

export default async function PadresHomePage() {
  const { session } = await getActiveMembership();
  const firstName = session.user.name?.split(" ")[0] ?? "papá/mamá";
  const children = await getMyChildren(session.user.id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-medium text-pitch">Portal de padres</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
        Hola, {firstName} 👋
      </h1>
      <p className="mt-1 text-ink-soft">
        {children.length
          ? "Aquí puedes seguir a tus hijos en la escuela."
          : "Aquí verás a tus hijos, sus pagos y cómo van sus partidos."}
      </p>

      <div className="mt-8">
        {children.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
            title="Aún no vemos a tus hijos"
            description="Pide a tu escuela que registre a tu hijo con este mismo correo y aparecerá aquí automáticamente."
          />
        ) : (
          <>
            <h2 className="mb-3 font-display text-lg font-bold">Mis hijos</h2>
            <ChildrenGrid kids={children} />
          </>
        )}
      </div>
    </div>
  );
}
