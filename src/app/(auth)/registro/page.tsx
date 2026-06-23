import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { TenantTheme } from "@/components/brand/tenant-theme";
import { getSchoolBySlug } from "@/lib/tenant-public";
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
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  const target = safeNext(next);
  const school = e ? await getSchoolBySlug(e) : null;

  // Preserva el contexto (a dónde ir + de qué escuela) al cambiar a login.
  const qs = new URLSearchParams();
  if (target) qs.set("next", target);
  if (school) qs.set("e", school.slug);
  const loginHref = `/login${qs.size ? `?${qs}` : ""}`;

  return (
    <TenantTheme primaryColor={school?.primaryColor}>
      <AuthShell
        title="Crear cuenta"
        subtitle={
          school
            ? `Regístrate para seguir a tus hijos en ${school.name}.`
            : "Regístrate para poner en orden tu escuela de futbol."
        }
        backHref={school ? `/e/${school.slug}` : "/"}
        backLabel={school ? school.name : "Inicio"}
        brand={school ? { name: school.name, logoUrl: school.logoUrl } : undefined}
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
    </TenantTheme>
  );
}
