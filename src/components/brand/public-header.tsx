import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import styles from "@/components/marketing/landing.module.css";

export function PublicHeader() {
  return (
    <header className="relative z-20 mx-auto w-full p-3 sm:p-5 lg:p-6">
      <div className={`${styles.glass} flex min-h-14 flex-wrap items-center justify-between gap-x-2 rounded-2xl border border-white/20 px-3 py-1.5 text-white [--color-pitch:var(--color-primary-container)] sm:min-h-17 sm:gap-x-4 sm:px-5`}>
        <div className="[&>span>span]:text-base sm:[&>span>span]:text-lg">
          <Wordmark href={null} />
        </div>
        <nav aria-label="Navegación principal" className="flex items-center gap-3 sm:gap-6">
          <a
            href="#funciones"
            className="inline-flex min-h-12 items-center rounded-sm text-xs font-medium text-white underline-offset-4 hover:underline sm:text-sm"
          >
            Qué incluye
          </a>
          <Link href="/login" className="inline-flex min-h-12 items-center rounded-sm text-xs font-semibold text-white underline-offset-4 hover:underline sm:text-sm">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="md-button md-tonal hidden sm:inline-flex">
            Crear cuenta <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
