import { getActiveMembership } from "@/lib/tenant";

export default async function AdminHomePage() {
  const { membership } = await getActiveMembership();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Bienvenido a {membership.school.name}
      </h1>
      <p className="mt-1 text-slate-500">
        Este es el panel de administración. Desde aquí gestionarás todo tu club.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alumnos" value="0" hint="Próximamente (Fase 1)" />
        <StatCard label="Equipos" value="0" hint="Próximamente (Fase 1)" />
        <StatCard label="Pagos del mes" value="—" hint="Próximamente (Fase 3)" />
        <StatCard label="Próximos partidos" value="—" hint="Próximamente (Fase 4)" />
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="font-semibold text-slate-800">Siguiente paso</h2>
        <p className="mt-1 text-sm text-slate-500">
          La base está lista (cuenta, escuela y roles). En la Fase 1 daremos de
          alta categorías, equipos y el registro de alumnos.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
