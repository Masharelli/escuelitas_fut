import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyMemberships, ADMIN_ROLES, type Role } from "@/lib/tenant";
import { claimStudentsByEmail } from "@/lib/guardians";
import { Wordmark } from "@/components/brand/wordmark";
import { PitchBackdrop } from "@/components/brand/pitch-backdrop";

export default async function HomePage() {
  const session = await auth();

  // Usuario con sesión: lo enviamos a su portal según su rol.
  if (session?.user?.id) {
    // Vincula al usuario con sus hijos si su correo coincide con el del tutor.
    await claimStudentsByEmail(session.user.id, session.user.email);

    const mine = await getMyMemberships(session.user.id);
    if (mine.length === 0) redirect("/onboarding");
    // Enruta según el rol: admin/owner → panel; entrenador → su portal; el
    // resto (padres) → portal de padres.
    const hasAdmin = mine.some((m) => ADMIN_ROLES.includes(m.role as Role));
    const isCoach = mine.some((m) => m.role === "coach");
    redirect(hasAdmin ? "/admin" : isCoach ? "/coach" : "/padres");
  }

  return (
    <main className="relative flex w-full min-w-0 flex-1 flex-col overflow-hidden bg-chalk text-ink">
      <PitchBackdrop />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Wordmark />
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-chalk-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          Iniciar sesión
        </Link>
      </header>

      <section className="relative z-10 flex w-full min-w-0 flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        <p className="rise max-w-full text-center text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-soft sm:text-xs sm:tracking-[0.18em]">
          <span className="relative mr-2 inline-flex h-2 w-2 align-middle">
            <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-tangerine" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-tangerine" />
          </span>
          Plataforma para escuelas de futbol
        </p>

        <h1 className="rise mt-6 w-full max-w-4xl text-balance font-display text-[clamp(2rem,7vw,4.5rem)] font-extrabold leading-[1.14] tracking-tight">
          Administra tu escuela de{" "}
          <span className="relative whitespace-nowrap text-pitch">
            futbol
            <ChalkUnderline />
          </span>{" "}
          en un solo lugar
        </h1>

        <p className="rise mt-6 w-full max-w-xl text-balance text-lg leading-relaxed text-ink-soft">
          Alumnos, pagos, partidos y torneos en un mismo tablero. Y los papás
          reciben cada resultado en su celular, en cuanto suena el silbatazo
          final.
        </p>

        <div className="rise mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="group inline-flex items-center gap-2 rounded-full bg-pitch px-7 py-3.5 text-base font-semibold text-chalk shadow-sm transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            Empezar gratis
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-ink/15 bg-chalk px-7 py-3.5 text-base font-semibold text-ink transition hover:border-ink/30 hover:bg-chalk-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            Iniciar sesión
          </Link>
        </div>

        <ul className="rise mt-14 flex flex-wrap items-center justify-center gap-3">
          <FeatureChip icon={<RosterIcon />} label="Control de alumnos" />
          <FeatureChip icon={<PaymentIcon />} label="Pagos en línea" />
          <FeatureChip icon={<WhistleIcon />} label="Resultados al instante" />
        </ul>
      </section>
    </main>
  );
}

function ChalkUnderline() {
  return (
    <svg
      className="absolute -bottom-[0.06em] left-0 h-[0.32em] w-full text-tangerine"
      viewBox="0 0 200 16"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M3 11C40 5 90 4 130 7c25 2 45 4 67 2"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Chips de beneficios (la "alineación" de lo que incluye) ─────────────── */

function FeatureChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-full border border-ink/10 bg-chalk/80 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur">
      <span className="text-pitch">{icon}</span>
      {label}
    </li>
  );
}

function RosterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17.5 19c0-2.2-1-3.8-2.5-4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="18"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 14.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WhistleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 9h9a1 1 0 0 1 1 1 6 6 0 1 1-9.5-4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 5.5V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}
