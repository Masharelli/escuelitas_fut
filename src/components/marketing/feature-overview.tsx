import { PrimaryLink, SecondaryLink } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";
import adminPanel from "../../../public/recorrido/panel.webp";
import students from "../../../public/recorrido/alumnos.webp";
import { CoachDemo } from "./coach-demo";
import { FamilyOverview } from "./family-overview";
import { MatchTimeline } from "./match-timeline";
import { Screenshot } from "./screenshot";
import { PortalPreview } from "./portal-preview";
import { FeatureIntro } from "./feature-intro";
import { EntranceGroup } from "./entrance-group";
import styles from "./recorrido.module.css";

const adminFeatures = [
  { title: "Inscripciones y equipos", icon: "students", description: "Inscribe alumnos, organiza categorías y equipos, y asigna entrenadores." },
  { title: "Mensualidades y becas", icon: "payments", description: "Define cuotas, aplica becas y programa vencimientos y renovaciones." },
  { title: "Control de pagos", icon: "finance", description: "Registra pagos recibidos y corrige cuotas marcadas por error." },
  { title: "Calendario", icon: "calendar", description: "Consulta los entrenamientos, partidos y resultados de tus equipos." },
] as const;

export function FeatureOverview() {
  return (
    <section
      id="funciones"
      tabIndex={-1}
      aria-labelledby="funciones-titulo"
      className={`${styles.overview} mx-auto mt-8 w-full max-w-7xl scroll-mt-5 px-4 pb-12 focus-visible:outline-pitch sm:mt-14 sm:px-8 xl:px-10`}
    >
      <FeatureIntro
        copy={
          <>
            <p className="text-sm font-semibold text-pitch">Qué incluye Escuelitas Fut</p>
            <h2 id="funciones-titulo" className="mt-2 max-w-[14ch] font-display text-[clamp(2.35rem,4vw,3.5rem)] leading-[1.02] font-bold tracking-[-0.045em]">
              De la inscripción <span className={styles.highlight}>al partido</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
              Explora lo que cada perfil puede hacer en la plataforma, desde la oficina de la escuela hasta la cancha y el celular de cada familia.
            </p>
          </>
        }
        preview={
          <Screenshot
            preview={<PortalPreview kind="panel" />}
            image={adminPanel}
            alt="Panel de administración con conteos de alumnos, equipos y próximos partidos."
            caption="Diseño de ejemplo con datos ficticios"
          />
        }
      />

      <AdministrationOverview />
      <CoachDemo />
      <FamilyOverview />

      <MatchTimeline />

      <section aria-labelledby="registro-titulo" className={styles.registration}>
        <EntranceGroup className={`${styles.sideEntrance} flex flex-wrap items-center justify-between gap-4`}>
          <h3 data-intro-item id="registro-titulo" className="max-w-lg font-display text-2xl font-bold tracking-tight">¿Listo para registrar tu escuela?</h3>
          <div data-intro-item className="flex flex-wrap gap-2">
            <PrimaryLink href="/registro">Crear cuenta <span aria-hidden="true">→</span></PrimaryLink>
            <SecondaryLink href="/login">Iniciar sesión</SecondaryLink>
          </div>
        </EntranceGroup>
      </section>
    </section>
  );
}

function AdministrationOverview() {
  return (
    <section id="administracion" tabIndex={-1} aria-labelledby="administracion-titulo" className={styles.featureSection}>
      <EntranceGroup className={`${styles.featureLayout} ${styles.sideEntrance}`}>
        <div data-intro-item className={styles.featureCopy}>
          <header>
            <p className={styles.featureLabel}>
              <PortalIcon icon="school" size={17} />
              Administración
            </p>
            <h3 id="administracion-titulo" className={styles.featureHeading}>
              Organiza tu <span>escuela</span>
            </h3>
            <p className={styles.featureDescription}>Consulta quién está inscrito, en qué equipo juega y qué pagos tiene pendientes.</p>
          </header>
          <Screenshot
            image={students}
            alt="Listado de alumnos con filtros por categoría, equipo y estado de pago, y una beca visible junto al nombre de un alumno."
            caption="Listado de alumnos"
            preview={<PortalPreview kind="students" />}
            board
          />
        </div>

        <ul data-intro-item className={styles.featureGrid} role="list">
          {adminFeatures.map(({ title, icon, description }) => (
            <li key={icon} className={styles.featureCard} data-featured={icon === "payments" ? "" : undefined}>
              <span className={styles.featureIcon}><PortalIcon icon={icon} size={28} /></span>
              <h4>{title}</h4>
              <p>{description}</p>
            </li>
          ))}
        </ul>
      </EntranceGroup>
    </section>
  );
}
