import { PrimaryLink, SecondaryLink } from "@/components/ui";
import { PortalIcon } from "@/components/portal/portal-icon";
import adminPanel from "../../../public/recorrido/panel.webp";
import students from "../../../public/recorrido/alumnos.webp";
import team from "../../../public/recorrido/entrenador.webp";
import family from "../../../public/recorrido/familias.webp";
import { FootballMotion } from "./football-motion";
import { Screenshot } from "./screenshot";
import styles from "./recorrido.module.css";

const roles = [
  {
    id: "administracion",
    title: "Administración",
    shortcut: "Alumnos, equipos y pagos",
    icon: "school",
    heading: "Organiza tu escuela",
    description: "Consulta quién está inscrito, en qué equipo juega y qué pagos tiene pendientes.",
    screenshot: {
      image: students,
      alt: "Listado de alumnos con filtros por categoría, equipo y estado de pago, y una beca visible junto al nombre de un alumno.",
      caption: "Listado de alumnos",
    },
    features: [
      { title: "Inscripciones y equipos", icon: "students", description: "Da de alta a cada alumno con su categoría, equipo, fecha de inscripción y beca. Asigna un entrenador a uno o varios equipos." },
      { title: "Mensualidades y becas", icon: "payments", description: "Configura las cuotas mensuales y la renovación anual. Revisa descuentos, vencimientos y pagos por alumno." },
      { title: "Control de pagos", icon: "finance", description: "Registra los pagos recibidos y corrige el estado si marcaste una cuota por error." },
      { title: "Calendario", icon: "calendar", description: "Consulta en el panel las sesiones, los partidos y los resultados de tus equipos." },
    ],
  },
  {
    id: "entrenadores",
    title: "Entrenadores",
    shortcut: "Asistencias y convocatorias",
    icon: "teams",
    heading: "Prepara a tus equipos",
    description: "Abre el portal de entrenador para consultar los alumnos y las actividades de cada equipo que tienes asignado.",
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
    shortcut: "Horarios, resultados y cuotas",
    icon: "kids",
    heading: "Sigue a cada uno de tus hijos",
    description: "Una misma cuenta reúne los perfiles de los hijos que la escuela vinculó con tu acceso.",
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
      <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-12">
        <div className={`min-w-0 ${styles.reveal} ${styles.copyReveal}`}>
          <p className="text-sm font-semibold text-pitch">Qué incluye Escuelitas Fut</p>
          <h2 id="funciones-titulo" className="mt-2 max-w-[14ch] font-display text-[clamp(2.35rem,4vw,3.5rem)] leading-[1.02] font-bold tracking-[-0.045em]">
            De la inscripción al partido
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Explora lo que cada perfil puede hacer en la plataforma, desde la oficina de la escuela hasta la cancha y el celular de cada familia.
          </p>
        </div>

        <Screenshot
          image={adminPanel}
          alt="Panel de administración con conteos de alumnos, equipos y próximos partidos."
          caption="Panel de administración con datos ficticios"
        />
      </div>

      <nav aria-label="Funciones por perfil" className="mt-6 sm:mt-9">
        <ul className="grid divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {roles.map(({ id, title, shortcut, icon }) => (
            <li key={id} className="min-w-0">
              <a href={`#${id}`} className="group flex h-full min-h-16 min-w-0 items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:bg-surface-container lg:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container sm:max-lg:hidden">
                  <PortalIcon icon={icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg leading-tight font-bold">{title}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft sm:text-sm">{shortcut}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 font-semibold text-pitch motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5">↓</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {roles.map(({ id, title, icon, heading, description, screenshot, features }) => (
        <section
          key={id}
          id={id}
          tabIndex={-1}
          aria-labelledby={`${id}-titulo`}
          className={`${styles.tacticsBoard} ${styles[id]} mt-7 grid scroll-mt-5 items-center gap-5 rounded-3xl p-4 focus-visible:outline-pitch sm:mt-9 sm:gap-7 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:p-8`}
        >
          <header className="flex min-w-0 flex-wrap items-center justify-between gap-4 lg:col-span-2">
            <div className="min-w-0">
              <p className={`${styles.boardAccent} inline-flex items-center gap-2 text-sm font-semibold`}>
                <PortalIcon icon={icon} size={18} />
                {title}
              </p>
              <h3 id={`${id}-titulo`} className="mt-1 font-display text-3xl leading-tight font-bold tracking-tight sm:text-[2.75rem]">
                {heading}
              </h3>
              <p className={`${styles.boardCopy} mt-2 max-w-xl leading-relaxed`}>{description}</p>
            </div>
            {id === "entrenadores" && <FootballMotion play="pass" />}
          </header>

          <div className={`relative isolate min-w-0 ${id === "administracion" ? "p-2 sm:p-3.5" : ""}`}>
            {id === "administracion" && <span aria-hidden="true" className={styles.pitchLines} />}
            <dl className={`grid min-w-0 gap-2.5 sm:gap-4 ${id === "administracion" ? "sm:grid-cols-2" : ""}`}>
              {features.map((feature) => (
                <div key={feature.title} className={`${styles.boardNote} min-w-0 rounded-lg p-3 sm:p-3.5`}>
                  <dt className="flex items-center gap-2 text-sm font-bold">
                    <span className={`${styles.boardMarker} flex size-8 shrink-0 items-center justify-center rounded-full`}>
                      <PortalIcon icon={feature.icon} size={17} />
                    </span>
                    {feature.title}
                  </dt>
                  <dd className={`${styles.boardCopy} mt-2 text-[0.83rem] leading-relaxed sm:text-sm`}>{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Screenshot {...screenshot} board />
        </section>
      ))}

      <section id="partido" aria-labelledby="partido-titulo" className={`${styles.tacticsBoard} ${styles.matchBoard} mt-7 scroll-mt-5 rounded-3xl p-4 sm:mt-9 sm:p-7 lg:p-8`}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h3 id="partido-titulo" className="max-w-sm font-display text-3xl leading-tight font-bold tracking-tight sm:text-[2.75rem]">Así se organiza un partido</h3>
          <FootballMotion play="goal" />
        </header>
        <ol role="list" className="mt-5 grid gap-2.5 sm:mt-7 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {matchSteps.map(({ role, action, description }, index) => (
            <li key={action} className={`${styles.boardNote} min-w-0 rounded-lg p-3 sm:p-3.5`}>
              <div className={`${styles.boardAccent} mb-2 flex items-center gap-2 text-sm font-semibold`}>
                <span aria-hidden="true" className={`${styles.boardMarker} inline-flex size-7 shrink-0 items-center justify-center rounded-full`}>{index + 1}</span>
                <span>{role}</span>
              </div>
              <h4 className="font-semibold">{action}</h4>
              <p className={`${styles.boardCopy} mt-1 max-w-xs text-sm leading-relaxed`}>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="registro-titulo" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-container px-5 py-6 sm:px-8">
        <h3 id="registro-titulo" className="max-w-lg font-display text-2xl font-bold tracking-tight">¿Listo para registrar tu escuela?</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryLink href="/registro">Crear cuenta <span aria-hidden="true">→</span></PrimaryLink>
          <SecondaryLink href="/login">Iniciar sesión</SecondaryLink>
        </div>
      </section>
    </section>
  );
}
