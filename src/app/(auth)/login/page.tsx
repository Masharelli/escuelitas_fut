import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

/** Sólo conserva rutas internas para el redirect tras iniciar sesión. */
function safeNext(value?: string): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);
  const registroHref = target
    ? `/registro?next=${encodeURIComponent(target)}`
    : "/registro";

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entra para administrar tu escuela o seguir a tus hijos."
      backHref="/"
      backLabel="Inicio"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            href={registroHref}
            className="font-semibold text-pitch hover:text-pitch-deep"
          >
            Crea una
          </Link>
        </>
      }
    >
      <LoginForm next={target} />
    </AuthShell>
  );
}
