import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyMemberships, ADMIN_ROLES, type Role } from "@/lib/tenant";
import { claimStudentsByEmail } from "@/lib/guardians";
import { PublicHeader } from "@/components/brand/public-header";
import { FeatureOverview } from "@/components/marketing/feature-overview";
import { HeroLinks } from "@/components/marketing/hero-links";
import trainingPhoto from "../../public/entrenamiento-infantil.webp";
import styles from "@/components/marketing/landing.module.css";

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
    <main className="flex w-full min-w-0 flex-1 flex-col">
      <section aria-labelledby="portada-titulo" className="mx-auto w-full max-w-[92rem] px-4 pt-4 sm:px-8 sm:pt-5">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-pitch-deep text-white sm:rounded-[2rem]">
          <PublicHeader />
          <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className={`${styles.copy} relative z-10 min-w-0 px-5 pt-5 pb-4 sm:px-9 sm:pt-7 lg:col-start-1 lg:row-start-1 lg:pt-9 lg:pb-6 xl:pl-15`}>
              <p className="text-sm font-semibold text-primary-container sm:text-base">Plataforma para escuelas de futbol</p>
              <h1 id="portada-titulo" className="mt-4 max-w-[15ch] font-display text-[clamp(2.45rem,6.1vw,5.75rem)] leading-[0.98] font-extrabold tracking-[-0.046em]">
                Tu escuela <span className="block">de futbol,</span>{" "}
                <span className="block text-primary-container">en orden.</span>
              </h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-chalk sm:mt-6 sm:text-lg">
                Inscribe alumnos, organiza equipos y lleva el control de las mensualidades. Las familias siguen los partidos y pagos de sus hijos desde su portal.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-3 gap-y-2 sm:mt-8">
                <Link href="/registro" className="md-button bg-primary-container px-4 text-on-primary-container hover:bg-white focus-visible:outline-primary-container sm:px-5">
                  Crear cuenta <span aria-hidden="true">→</span>
                </Link>
                <a href="#funciones" className="md-button border border-white/50 bg-white/5 px-4 text-white hover:bg-white/15 focus-visible:outline-primary-container sm:px-5">
                  Ver qué incluye <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
            <div className={styles.photo}>
              <Image
                src={trainingPhoto}
                alt="Un entrenador platica con su equipo infantil sentado en la cancha"
                fill
                preload
                sizes="(min-width: 1472px) 1070px, (min-width: 1024px) 76vw, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                className="object-cover object-[55%_52%]"
              />
            </div>
            <HeroLinks />
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-ink-soft">
          Foto de{" "}
          <a
            href="https://www.pexels.com/photo/a-coach-teaching-children-at-a-soccer-field-8941567/"
            className="rounded-sm underline decoration-outline underline-offset-3 hover:text-pitch"
          >
            Kampus Production
          </a>
        </p>
      </section>

      <FeatureOverview />
    </main>
  );
}
