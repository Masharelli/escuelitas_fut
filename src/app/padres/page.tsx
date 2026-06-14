import { getActiveMembership } from "@/lib/tenant";

export default async function PadresHomePage() {
  const { session } = await getActiveMembership();
  const firstName = session.user.name?.split(" ")[0] ?? "papá/mamá";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-medium text-pitch">Portal de padres</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
        Hola, {firstName} 👋
      </h1>
      <p className="mt-1 text-ink-soft">
        Aquí verás a tus hijos, sus pagos y cómo van sus partidos.
      </p>

      <div className="mt-8 rounded-2xl border border-ink/10 bg-white/80 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pitch/10 text-pitch">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="mt-4 font-display text-lg font-bold">
          Aún no hay nada que mostrar
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          En la Fase 2 podrás vincularte con tus hijos y empezar a ver su
          información, pagos y partidos.
        </p>
      </div>
    </div>
  );
}
