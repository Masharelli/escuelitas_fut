import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { RegistroForm } from "./registro-form";

/** Sólo conserva rutas internas para el redirect tras registrarse. */
function safeNext(value?: string): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);
  const loginHref = target
    ? `/login?next=${encodeURIComponent(target)}`
    : "/login";

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate para poner en orden tu escuela de futbol."
      backHref="/"
      backLabel="Inicio"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-pitch hover:text-pitch-deep"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <RegistroForm next={target} />
    </AuthShell>
  );
}
