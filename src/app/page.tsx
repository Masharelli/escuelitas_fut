import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyMemberships, ADMIN_ROLES, type Role } from "@/lib/tenant";

export default async function HomePage() {
  const session = await auth();

  // Usuario con sesión: lo enviamos a su portal según su rol.
  if (session?.user?.id) {
    const mine = await getMyMemberships(session.user.id);
    if (mine.length === 0) redirect("/onboarding");
    const role = mine[0].role as Role;
    redirect(ADMIN_ROLES.includes(role) ? "/admin" : "/padres");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
        ⚽ Escuelitas Fut
      </span>
      <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Administra tu escuela de futbol en un solo lugar
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-500">
        Control de alumnos, pagos en línea, partidos y torneos. Los papás
        reciben notificaciones de cómo van sus hijos.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/registro"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700"
        >
          Empezar gratis
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
