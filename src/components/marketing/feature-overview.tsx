import { PrimaryLink, SecondaryLink } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";
import adminPanel from "../../../public/recorrido/panel.webp";
import students from "../../../public/recorrido/alumnos.webp";
import team from "../../../public/recorrido/entrenador.webp";
import family from "../../../public/recorrido/familias.webp";
import { FootballMotion } from "./football-motion";
import { Screenshot } from "./screenshot";
import { PortalPreview } from "./portal-preview";
import { FeatureIntro } from "./feature-intro";
import { EntranceGroup } from "./entrance-group";
import styles from "./recorrido.module.css";

const roles = [
  {
    id: "administracion",
    title: "Administración",
    icon: "school",
    heading: "Organiza tu",
    emphasis: "escuela",
    description: "Consulta quién está inscrito, en qué equipo juega y qué pagos tiene pendientes.",
    preview: "students",
    highlight: "payments",
    screenshot: {
      image: students,
      alt: "Listado de alumnos con filtros por categoría, equipo y estado de pago, y una beca visible junto al nombre de un alumno.",
      caption: "Listado de alumnos",
    },
    features: [
      { title: "Inscripciones y equipos", icon: "students", description: "Inscribe alumnos, organiza categorías y equipos, y asigna entrenadores." },
      { title: "Mensualidades y becas", icon: "payments", description: "Define cuotas, aplica becas y programa vencimientos y renovaciones." },
      { title: "Control de pagos", icon: "finance", description: "Registra pagos recibidos y corrige cuotas marcadas por error." },
      { title: "Calendario", icon: "calendar", description: "Consulta los entrenamientos, partidos y resultados de tus equipos." },
    ],
  },
  {
    id: "entrenadores",
    title: "Entrenadores",
    icon: "teams",
    heading: "Prepara a",
    emphasis: "tus equipos",
    description: "Abre el portal de entrenador para consultar los alumnos y las actividades de cada equipo que tienes asignado.",
    preview: "coach",
    highlight: "matches",
    screenshot: {
      image: team,
      alt: "Ficha del equipo Águilas del Valle con las sesiones, los partidos, el plantel y el formulario de avisos a tutores.",
      caption: "Ficha de un equipo",
    },
    features: [
      { title: "Sesiones y asistencias", icon: "attendance", description: "Agenda entrenamientos y pasa lista en cada sesión." },
      { title: "Partidos y convocatorias", icon: "matches", description: "Selecciona a los alumnos convocados, revisa las respuestas de sus tutores y registra el marcador." },
      { title: "Avisos a los tutores", icon: "notifications", description: "Envía un aviso a los tutores de todo el equipo o a una familia en particular." },
    ],
  },
  {
    id: "familias",
    title: "Familias",
    icon: "kids",
    heading: "Sigue a cada uno",
    emphasis: "de tus hijos",
    description: "Una misma cuenta reúne los perfiles de los hijos que la escuela vinculó con tu acceso.",
    preview: "family",
    highlight: "calendar",
    screenshot: {
      image: family,
      alt: "Portal de familias en móvil con dos perfiles de hijos y accesos a pagos, partidos y entrenamientos.",
      caption: "Portal de familias en móvil",
      portrait: true,
    },
    features: [
      { title: "Perfil y estadísticas", icon: "kids", description: "Abre el perfil de cada hijo para consultar su categoría, equipo y estadísticas registradas." },
      { title: "Horarios y convocatorias", icon: "calendar", description: "Revisa cuándo juega o entrena y confirma si asistirá cuando lo convoquen." },
      { title: "Cuotas y pagos", icon: "payments", description: "Consulta por hijo el importe de las cuotas pendientes y el historial de pagos registrados." },
    ],
  },
] as const;

const matchSteps = [
  { role: "Administración", action: "Agenda el partido", description: "Elige el equipo y registra rival, fecha, hora y sede." },
  { role: "Entrenador", action: "Envía la convocatoria", description: "Selecciona a los alumnos que quieres convocar." },
  { role: "Familias", action: "Confirman asistencia", description: "Cada tutor ve la convocatoria y responde desde su portal." },
  { role: "Entrenador", action: "Registra el resultado", description: "Captura el marcador para que las familias puedan consultarlo." },
];

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

      {roles.map(({ id, title, icon, heading, emphasis, description, preview, highlight, screenshot, features }) => (
        <section
          key={id}
          id={id}
          tabIndex={-1}
          aria-labelledby={`${id}-titulo`}
          className={styles.featureSection}
        >
          <EntranceGroup className={`${styles.featureLayout} ${styles.sideEntrance}`}>
            <div data-intro-item className={styles.featureCopy}>
              <header>
                <p className={styles.featureLabel}>
                  <PortalIcon icon={icon} size={17} />
                  {title}
                </p>
                <h3 id={`${id}-titulo`} className={styles.featureHeading}>
                  {heading} <span>{emphasis}</span>
                </h3>
                <p className={styles.featureDescription}>{description}</p>
              </header>
              <Screenshot {...screenshot} preview={<PortalPreview kind={preview} />} board />
            </div>

            <ul data-intro-item className={styles.featureGrid} role="list">
              {features.map(({ title, icon, description }) => (
                <li key={icon} className={styles.featureCard} data-featured={icon === highlight ? "" : undefined}>
                  <span className={styles.featureIcon}><PortalIcon icon={icon} size={28} /></span>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </li>
              ))}
              {preview === "coach" && (
                <li className={styles.featureCard} aria-hidden="true"><FootballMotion play="pass" /></li>
              )}
            </ul>
          </EntranceGroup>
        </section>
      ))}

      <section id="partido" aria-labelledby="partido-titulo" className={styles.featureSection}>
        <EntranceGroup className={`${styles.featureLayout} ${styles.sideEntrance}`}>
          <div data-intro-item className={styles.featureCopy}>
            <h3 id="partido-titulo" className={styles.featureHeading}>Así se organiza <span>un partido</span></h3>
            <FootballMotion play="goal" />
          </div>
          <ol data-intro-item className={styles.featureGrid} role="list">
            {matchSteps.map(({ role, action, description }, index) => (
              <li key={action} className={styles.featureCard} data-featured={index === 3 ? "" : undefined}>
                <span aria-hidden="true" className={styles.featureIcon}>{index + 1}</span>
                <span className={styles.matchRole}>{role}</span>
                <h4>{action}</h4>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </EntranceGroup>
      </section>

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
