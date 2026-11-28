"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { PortalIcon } from "@/components/portal/portal-icon";
import { EntranceGroup } from "./entrance-group";
import styles from "./family-overview.module.css";
import layout from "./recorrido.module.css";

const profiles = [
  {
    id: "valentina",
    name: "Valentina",
    team: "Halcones de la Sierra",
    category: "Sub-15",
    practice: { day: "Jueves", time: "18:00", venue: "Cancha principal" },
    match: { day: "Sábado", time: "10:00", venue: "Cancha Municipal", opponent: "Lobos FC", status: "Por confirmar" },
    next: "match",
    payment: { pending: "$950 MXN", last: "$950 MXN · 10 ene" },
  },
  {
    id: "santiago",
    name: "Santiago",
    team: "Águilas del Valle",
    category: "Sub-12",
    practice: { day: "Martes", time: "17:30", venue: "Cancha principal" },
    match: { day: "Sábado", time: "10:00", venue: "Cancha Municipal", opponent: "Río Verde", status: "Confirmado" },
    next: "practice",
    payment: { pending: "$500 MXN", last: "$500 MXN · 10 ene" },
  },
] as const;

const phoneViews = [
  { id: "summary", label: "Resumen" },
  { id: "practice", label: "Prácticas" },
  { id: "match", label: "Partidos" },
] as const;

export function FamilyOverview() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % profiles.length; break;
      case "ArrowLeft": next = (index + profiles.length - 1) % profiles.length; break;
      case "Home": next = 0; break;
      case "End": next = profiles.length - 1; break;
      default: return;
    }

    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="familias" tabIndex={-1} aria-labelledby="familias-titulo" className={`${layout.featureSection} ${styles.section}`}>
      <EntranceGroup className={styles.entrance}>
        <div data-intro-item className={styles.copy}>
          <header>
            <p className={styles.role}>Familias</p>
            <h3 id="familias-titulo">Sigue a cada uno <span>de tus hijos</span></h3>
            <p className={styles.description}>Una sola cuenta para ver a cada hijo.</p>
          </header>
          <div role="tablist" aria-label="Perfiles de ejemplo" className={styles.profileTabs}>
            {profiles.map(({ id, name }, index) => (
              <button
                key={id}
                ref={(element) => { tabs.current[index] = element; }}
                type="button"
                data-plain
                role="tab"
                id={`familia-tab-${id}`}
                aria-controls={`familia-perfil-${id}`}
                aria-selected={active === index}
                tabIndex={active === index ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <figure data-intro-item className={styles.visual}>
          <div className={styles.scene}>
            {profiles.map((profile, index) => (
              <div
                key={profile.id}
                role="tabpanel"
                id={`familia-perfil-${profile.id}`}
                aria-labelledby={`familia-tab-${profile.id}`}
                hidden={active !== index}
              >
                {active === index && <FamilyPhone profile={profile} />}
              </div>
            ))}
            <div aria-hidden="true" className={`${styles.callout} ${styles.activityCallout}`}>
              <span><PortalIcon icon="calendar" size={23} /></span>
              {profiles[active].next === "match" ? "Próximo partido" : "Próximo entrenamiento"}
            </div>
            <div aria-hidden="true" className={`${styles.callout} ${styles.paymentCallout}`}>
              <span><PortalIcon icon="payments" size={23} /></span>
              Cuotas y pagos
            </div>
          </div>
          <figcaption>Vista previa con datos de ejemplo</figcaption>
        </figure>
      </EntranceGroup>
    </section>
  );
}

function FamilyPhone({ profile }: { profile: (typeof profiles)[number] }) {
  const [view, setView] = useState<(typeof phoneViews)[number]["id"]>("summary");
  const activity = profile[view === "summary" ? profile.next : view];
  const showsMatch = view === "match" || (view === "summary" && profile.next === "match");
  const showDetails = view !== "summary";

  return (
    <div className={styles.phone}>
      <div className={styles.screen}>
        <span className={styles.camera} aria-hidden="true" />
        <div className={styles.phoneProfile}>
          <h4>{profile.name}</h4>
          <p>{profile.team} · {profile.category}</p>
        </div>
        <div role="group" aria-label={`Vista de ${profile.name}`} className={styles.phoneNav}>
          {phoneViews.map(({ id, label }) => (
            <button key={id} type="button" data-plain aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <div className={styles.phoneDetails} aria-live="polite">
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}><PortalIcon icon="calendar" size={19} /></span>
            <div>
              <p>{showsMatch ? "Próximo partido" : "Próximo entrenamiento"}</p>
              <p>{activity.day} · <time dateTime={activity.time}>{activity.time} h</time></p>
              {showDetails && <p>{activity.venue}</p>}
              {view === "match" && <p>vs. {profile.match.opponent} · {profile.match.status}</p>}
            </div>
          </div>
          {view === "summary" && (
            <div className={styles.infoRow}>
              <span className={styles.infoIcon}><PortalIcon icon="payments" size={19} /></span>
              <div>
                <p>Cuotas y pagos</p>
                <p>{profile.payment.pending} pendientes</p>
                <p>Último pago · {profile.payment.last}</p>
              </div>
            </div>
          )}
        </div>
        <span className={styles.homeBar} aria-hidden="true" />
      </div>
    </div>
  );
}
