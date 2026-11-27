import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyMemberships, ADMIN_ROLES, type Role } from "@/lib/tenant";
import { claimStudentsByEmail } from "@/lib/guardians";
import { PitchBackdrop } from "@/components/brand/pitch-backdrop";
import { PublicHeader } from "@/components/brand/public-header";
import { EntranceGroup } from "@/components/marketing/entrance-group";
import { FeatureOverview } from "@/components/marketing/feature-overview";
import trainingPhoto from "../../public/entrenamiento-estadio.webp";
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
    <main className={styles.site}>
      <PublicHeader />
      <section aria-labelledby="portada-titulo" className={styles.heroSection}>
        <div className={styles.hero}>
          <div className={styles.photo}>
            <Image
              src={trainingPhoto}
              alt="Un entrenador acompaña a dos niños que juegan futbol en una cancha iluminada al anochecer"
              fill
              preload
              sizes="(width < 800px) max(100vw, 178svh), 100vw"
              className={styles.heroImage}
            />
          </div>
          <div className={styles.heroContent}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>Tu escuela. Tu equipo. Todo conectado.</p>
              <h1 id="portada-titulo" className={styles.headline}>
                Tu escuela <span className="block">de futbol,</span>{" "}
                <span className="block text-primary-container">en orden.</span>
              </h1>
              <p className={styles.heroDescription}>
                Alumnos, pagos y partidos en un solo lugar.
              </p>
              <div className={styles.heroActions}>
                <Link href="/registro" className={styles.heroAction}>
                  Crear cuenta
                </Link>
                <a href="#funciones" className={styles.heroAction}>
                  Ver cómo funciona
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.siteContent}>
        <div className={styles.contentBackdrop} aria-hidden="true">
          <PitchBackdrop />
        </div>
        <div className={styles.contentBody}>
          <EntranceGroup className={styles.bridge}>
            <p data-intro-item className="font-display">Más tiempo en la cancha.</p>
            <p data-intro-item>Menos tiempo en pendientes.</p>
          </EntranceGroup>
          <FeatureOverview />
          <footer className={styles.footer}>
            <span className="font-display font-bold">Escuelitas Fut</span>
            <span>Para quienes hacen equipo, dentro y fuera de la cancha.</span>
            <Link href="/login">Iniciar sesión <span aria-hidden="true">↗</span></Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
