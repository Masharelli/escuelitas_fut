"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { PortalIcon } from "@/components/portal/portal-icon";
import { EntranceGroup } from "./entrance-group";
import styles from "./coach-demo.module.css";
import layout from "./recorrido.module.css";

const CoachDemoPlayer = dynamic(() => import("./coach-demo-player"), { ssr: false });

const views = [
  {
    id: "sesiones",
    label: "Sesiones y asistencias",
    nav: "Sesiones",
    icon: "attendance",
    description: "Agenda entrenamientos y pasa lista en cada sesión.",
    category: "Entrenamiento",
    event: "Control de balón y pases",
    schedule: "Martes · 17:30 h",
    location: "Cancha principal",
    listTitle: "Pase de lista",
    summary: "3 de 4 asistieron",
    progress: 3 / 4,
    groups: [
      { label: "Presentes", names: ["Mateo Aguilar", "Lucas Benítez", "Emilio Torres"], positive: true },
      { label: "Ausentes", names: ["Tomás Herrera"], positive: false },
    ],
  },
  {
    id: "partidos",
    label: "Partidos y convocatorias",
    nav: "Partidos",
    icon: "matches",
    description: "Convoca a tus jugadores, revisa las respuestas de sus tutores y registra el marcador.",
    category: "Próximo partido",
    event: "Águilas del Valle vs. Río Verde",
    schedule: "Sábado · 10:00 h",
    location: "Cancha Municipal",
    listTitle: "Confirmación de asistencia",
    summary: "3 de 5 confirmaron",
    progress: 3 / 5,
    groups: [
      { label: "Confirmados", names: ["Mateo Aguilar", "Lucas Benítez", "Emilio Torres"], positive: true },
      { label: "Pendientes", names: ["Tomás Herrera", "Nicolás Paz"], positive: false },
    ],
  },
  {
    id: "avisos",
    label: "Avisos a los tutores",
    nav: "Avisos",
    icon: "notifications",
    description: "Envía un aviso a los tutores de todo el equipo o a una familia en particular.",
    category: "Aviso al equipo",
    event: "Cambio de cancha",
    schedule: "Para todos los tutores del equipo",
    location: "El sábado jugamos en la Cancha Municipal.",
    listTitle: "Destinatarios del aviso",
    summary: "5 tutores del equipo",
    progress: 1,
    groups: [
      { label: "Equipo completo", names: ["Todos los tutores"], positive: true },
      { label: "Aviso individual", names: ["Por ejemplo, familia Herrera"], positive: false },
    ],
  },
] as const;

export function CoachDemo() {
  const [active, setActive] = useState(1);
  const [playMotion, setPlayMotion] = useState(false);
  const demo = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const element = demo.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || reducedMotion.matches) return;

      setPlayMotion(true);
      observer.disconnect();
    });

    const syncMotion = () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        setPlayMotion(false);
      } else {
        observer.observe(element);
      }
    };

    if (!reducedMotion.matches) observer.observe(element);
    reducedMotion.addEventListener("change", syncMotion);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % views.length; break;
      case "ArrowLeft": next = (index + views.length - 1) % views.length; break;
      case "Home": next = 0; break;
      case "End": next = views.length - 1; break;
      default: return;
    }

    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="entrenadores" tabIndex={-1} aria-labelledby="entrenadores-titulo" className={`${layout.featureSection} ${styles.section}`}>
      <EntranceGroup className={styles.entrance}>
        <header data-intro-item className={styles.header}>
          <p className={styles.role}>Entrenadores</p>
          <h3 id="entrenadores-titulo">Prepara a <span>tus equipos</span></h3>
          <p>Organiza entrenamientos, partidos y avisos desde el portal de entrenador.</p>
        </header>

        <div ref={demo} data-intro-item className={styles.demo}>
          <div role="tablist" aria-label="Funciones del portal de entrenador" className={styles.tabs}>
            {views.map(({ id, label }, index) => (
              <button
                key={id}
                ref={(element) => { tabs.current[index] = element; }}
                type="button"
                data-plain
                role="tab"
                id={`demo-entrenador-tab-${id}`}
                aria-controls={`demo-entrenador-panel-${id}`}
                aria-selected={active === index}
                tabIndex={active === index ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {label}
              </button>
            ))}
          </div>

          <figure className={styles.preview}>
            <div className={styles.window}>
              <aside aria-hidden="true" className={styles.sidebar}>
                <p>Escuelitas <span>Fut</span></p>
                <ul>
                  <li><PortalIcon icon="teams" size={18} /> Equipos</li>
                  {views.map(({ id, nav, icon }, index) => (
                    <li key={id} data-active={index === active ? "" : undefined}>
                      <PortalIcon icon={icon} size={18} /> {nav}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className={styles.workspace}>
                <div className={styles.team}>
                  <span><PortalIcon icon="teams" size={24} /></span>
                  <div><p>Sub-12</p><h4>Águilas del Valle</h4></div>
                </div>
                {views.map((view, index) => (
                  <div
                    key={view.id}
                    role="tabpanel"
                    id={`demo-entrenador-panel-${view.id}`}
                    aria-labelledby={`demo-entrenador-tab-${view.id}`}
                    hidden={active !== index}
                    tabIndex={0}
                  >
                    {active === index && <CoachPanel view={view} playMotion={playMotion} />}
                  </div>
                ))}
              </div>
            </div>
            <figcaption>Vista previa con datos de ejemplo</figcaption>
          </figure>
        </div>
      </EntranceGroup>
    </section>
  );
}

function CoachPanel({ view, playMotion }: { view: (typeof views)[number]; playMotion: boolean }) {
  return (
    <div className={styles.panel}>
      <p className={styles.description}>{view.description}</p>
      <div className={styles.details}>
        <div className={styles.event}>
          <span className={styles.category}><PortalIcon icon={view.icon} size={15} />{view.category}</span>
          <h5>{view.event}</h5>
          <p>{view.schedule}</p>
          <p>{view.location}</p>
        </div>
        <div className={styles.attendance}>
          <h5>{view.listTitle}</h5>
          <p className={styles.summary}>{view.summary}</p>
          <div aria-hidden="true" inert className={styles.progress}>
            <span style={{ width: `${view.progress * 100}%` }} />
            {playMotion && <CoachDemoPlayer progress={view.progress} />}
          </div>
          <div className={styles.groups}>
            {view.groups.map(({ label, names, positive }) => (
              <div key={label} className={styles.statusGroup} data-positive={positive ? "" : undefined}>
                <p>{label}</p>
                <ul>{names.map((name) => <li key={name}>{name}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
