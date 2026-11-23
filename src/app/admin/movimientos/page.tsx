import { and, desc, eq, lt, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { requireRole, OWNER_ROLES } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<{ antes?: string; id?: string }> }) {
  const { membership } = await requireRole(OWNER_ROLES);
  const { antes, id } = await searchParams;
  const before = antes ? new Date(antes) : null;
  const rows = await db.query.activityLog.findMany({
    where: and(eq(activityLog.schoolId, membership.schoolId), before && id && !Number.isNaN(before.getTime()) ? or(lt(activityLog.createdAt, before), and(eq(activityLog.createdAt, before), lt(activityLog.id, id))) : undefined),
    orderBy: [desc(activityLog.createdAt), desc(activityLog.id)], limit: 101,
  });
  const visible = rows.slice(0, 100);
  const roles: Record<string, string> = { owner: "Dueño", admin: "Administrador", coach: "Profesor", parent: "Tutor", scorekeeper: "Estadístico del partido" };
  const statuses: Record<string, string> = { started: "Iniciada", completed: "Procesada", failed: "Con error", rejected: "Datos rechazados" };
  return <div className="mx-auto w-full max-w-5xl">
    <PageHeader eyebrow="Control del dueño" title="Historial de movimientos" subtitle="Operaciones registradas desde la activación de este historial. Incluye pagos, egresos y cambios operativos." />
    {visible.length ? <ul className="space-y-3">{visible.map((row) => <li key={row.id} className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{row.action}</p><span className="text-sm text-ink-soft">{statuses[row.status] ?? row.status}</span></div>
      <p className="mt-1 text-sm text-ink-soft">{row.actorName ?? row.actorId} · {roles[row.actorRole] ?? row.actorRole} · {row.createdAt.toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</p>
      <details className="mt-2 text-sm"><summary className="cursor-pointer text-pitch">Ver datos de la operación</summary><dl className="mt-2 space-y-1 break-words">{Object.entries(row.details).map(([key, values]) => <div key={key}><dt className="font-medium">{key}</dt><dd className="text-ink-soft">{values.join(", ")}</dd></div>)}</dl></details>
    </li>)}</ul> : <p className="text-sm text-ink-soft">Todavía no hay movimientos registrados.</p>}
    {rows.length > 100 && <Link href={`/admin/movimientos?antes=${encodeURIComponent(visible.at(-1)!.createdAt.toISOString())}&id=${encodeURIComponent(visible.at(-1)!.id)}`} className="mt-5 inline-block font-semibold text-pitch">Ver movimientos anteriores</Link>}
  </div>;
}
