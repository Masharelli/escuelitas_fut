import { getActiveMembership } from "@/lib/tenant";

export default async function PadresHomePage() {
  const { session } = await getActiveMembership();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Hola, {session.user.name?.split(" ")[0] ?? "papá/mamá"} 👋
      </h1>
      <p className="mt-1 text-slate-500">
        Aquí verás a tus hijos, sus pagos y cómo van sus partidos.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="font-semibold text-slate-800">Aún no hay nada que mostrar</h2>
        <p className="mt-1 text-sm text-slate-500">
          En la Fase 2 podrás vincularte con tus hijos y empezar a ver su
          información, pagos y partidos.
        </p>
      </div>
    </div>
  );
}
