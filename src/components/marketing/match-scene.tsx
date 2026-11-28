import type { CSSProperties } from "react";

import { PortalIcon } from "@/components/portal/portal-icon";
import styles from "./match-timeline.module.css";

const teams = "Águilas del Valle vs. Río Verde";

export const matchSteps = [
  { role: "Administración", title: "Agenda el partido", description: "Elige el equipo y registra el rival, la fecha, la hora y la sede.", icon: "calendar", label: "Partido programado", value: "Sábado · 10:00 h", note: "Cancha Municipal" },
  { role: "Entrenador", title: "Envía la convocatoria", description: "Selecciona a los jugadores que quieres convocar para el partido.", icon: "teams", label: "Convocatoria enviada", value: "8 jugadores", note: "Disponible en el portal de familias" },
  { role: "Familias", title: "Confirman asistencia", description: "Cada tutor consulta la convocatoria y responde desde su portal.", icon: "attendance", label: "Asistencia confirmada", value: "7 de 8", note: "1 respuesta pendiente" },
  { role: "Entrenador", title: "Registra el resultado", description: "Captura el marcador para que las familias puedan consultarlo.", icon: "trophy", label: "Marcador final", value: "3 – 1", note: "Águilas del Valle · Río Verde" },
] as const;

export const matchFps = 30;
export const secondsPerStep = 3;
export const entranceSeconds = .55;
export const framesPerStep = secondsPerStep * matchFps;
export const matchDuration = matchSteps.length * framesPerStep;
export const settledFrame = Math.ceil(entranceSeconds * matchFps);

export function matchStepAtFrame(frame: number) {
  return Math.min(Math.floor(frame / framesPerStep), matchSteps.length - 1);
}

export function MatchScene({ step, style }: { step: number; style?: CSSProperties }) {
  const { icon, label, value, note } = matchSteps[step];

  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.pitch}><span /></div>
      <div className={styles.sceneHeader}>
        <PortalIcon icon="matches" size={26} />
        <p>{teams}</p>
      </div>
      <div className={styles.sceneCard} style={style}>
        <div className={styles.sceneIcon}><PortalIcon icon={icon} size={38} /></div>
        <p className={styles.sceneLabel}>{label}</p>
        <strong>{value}</strong>
        <p className={styles.sceneNote}>{note}</p>
      </div>
    </div>
  );
}
