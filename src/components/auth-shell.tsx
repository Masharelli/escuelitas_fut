import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { PitchBackdrop } from "@/components/brand/pitch-backdrop";
import { SchoolCrest } from "@/components/brand/school-crest";

/**
 * Marco común de las pantallas de autenticación (login, registro, recuperar):
 * fondo de cancha, botón de regresar, logo centrado y una tarjeta para el
 * contenido. `footer` se muestra debajo de la tarjeta (p. ej. el enlace para
 * cambiar entre crear cuenta e iniciar sesión).
 */
export function AuthShell({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Inicio",
  topLeft,
  brand,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** Reemplaza el botón de regresar por defecto (p. ej. "Cerrar sesión"). */
  topLeft?: React.ReactNode;
  /** Si viene de una escuela (`/e/[slug]`), muestra su escudo y nombre. */
  brand?: { name: string; logoUrl: string | null };
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex w-full min-w-0 flex-1 flex-col overflow-hidden bg-chalk text-ink">
      <PitchBackdrop />

      <header className="relative z-10 px-6 py-6 sm:px-10">
        {topLeft ?? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-chalk-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M19 12H5M11 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {backLabel}
          </Link>
        )}
      </header>

      <section className="relative z-10 flex w-full min-w-0 flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="rise flex w-full max-w-md flex-col items-center">
          {brand ? (
            <div className="flex flex-col items-center gap-2.5">
              <SchoolCrest name={brand.name} logoUrl={brand.logoUrl} size={64} />
              <span className="font-display text-xl font-extrabold tracking-tight">
                {brand.name}
              </span>
            </div>
          ) : (
            <Wordmark size="lg" />
          )}

          <div className="mt-8 w-full rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>
          )}
        </div>
      </section>
    </main>
  );
}
