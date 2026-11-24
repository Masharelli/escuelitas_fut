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

      <header className="relative z-10 px-4 py-3 sm:px-8 sm:py-5">
        {topLeft ?? (
          <Link
            href={backHref}
            className="md-button bg-surface px-4 text-ink-soft hover:bg-chalk-deep hover:text-ink"
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

      <section className="relative z-10 flex w-full min-w-0 flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="rise flex w-full max-w-lg flex-col items-center">
          {brand ? (
            <div className="flex flex-col items-center gap-2.5">
              <SchoolCrest name={brand.name} logoUrl={brand.logoUrl} size={64} />
              <span className="text-center font-display text-xl font-extrabold tracking-tight">
                {brand.name}
              </span>
            </div>
          ) : (
            <Wordmark size="lg" />
          )}

          <div className="mt-5 w-full rounded-[1.75rem] border border-outline-variant bg-surface p-5 sm:mt-7 sm:rounded-[2rem] sm:p-8">
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
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
