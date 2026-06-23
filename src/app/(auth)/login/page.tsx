import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { TenantTheme } from "@/components/brand/tenant-theme";
import { getSchoolBySlug } from "@/lib/tenant-public";
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
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  const target = safeNext(next);
  const school = e ? await getSchoolBySlug(e) : null;

  // Preserva el contexto (a dónde ir + de qué escuela) al cambiar a registro.
  const qs = new URLSearchParams();
  if (target) qs.set("next", target);
  if (school) qs.set("e", school.slug);
  const registroHref = `/registro${qs.size ? `?${qs}` : ""}`;

  return (
    <TenantTheme primaryColor={school?.primaryColor}>
      <AuthShell
        title="Iniciar sesión"
        subtitle={
          school
            ? `Entra a ${school.name}.`
            : "Entra para administrar tu escuela o seguir a tus hijos."
        }
        backHref={school ? `/e/${school.slug}` : "/"}
        backLabel={school ? school.name : "Inicio"}
        brand={school ? { name: school.name, logoUrl: school.logoUrl } : undefined}
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
    </TenantTheme>
  );
}
