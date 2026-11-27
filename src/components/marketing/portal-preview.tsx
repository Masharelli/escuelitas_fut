import { PortalIcon, type NavIcon } from "@/components/portal/portal-icon";
import styles from "./portal-preview.module.css";

export type PreviewKind = "panel" | "students" | "coach" | "family";
const menu: { title: string; icon: NavIcon }[] = [
  { title: "Inicio", icon: "home" }, { title: "Alumnos", icon: "students" },
  { title: "Equipos", icon: "teams" }, { title: "Pagos", icon: "payments" },
  { title: "Becas", icon: "attendance" }, { title: "Finanzas", icon: "finance" },
];
const students = [
  { name: "Santiago Emiliano Torres García", category: "Sub-12 · Águilas del Valle", initial: "S", status: "Pago al día" },
  { name: "Valentina Sofía Torres García", category: "Sub-15 · Halcones de la Sierra", initial: "V", status: "Beca vigente" },
];

/** Decorative design preview. The enclosing control opens the real product capture. */
export function PortalPreview({ kind }: { kind: PreviewKind }) {
  return (
    <div className={`${styles.preview} ${kind === "family" ? styles.portrait : ""}`} aria-hidden="true">
      <div className={styles.window}>
        {kind !== "family" && <div className={styles.sidebar}>
          <div className={styles.brand}><span>◉</span> Escuelitas Fut <span className={styles.bell}>♧</span></div>
          <div className={styles.school}><span>A</span><div>Academia de Futbol<br />Valle de México<small>Administración</small></div></div>
          <div className={styles.select}>Academia de Futbol Valle…⌄</div>
          <div className={styles.menu}>{menu.map(({ title, icon }, i) => <div key={title} className={(kind === "students" ? i === 1 : i === 0) ? styles.selected : ""}><PortalIcon icon={icon} size={12} /><span>{title}</span></div>)}</div>
          <div className={styles.account}>M <span>Mariana Hernández</span> ↪</div>
        </div>}
        <div className={styles.content}>
          {kind === "panel" && <>
            <div className={styles.greeting}><small>Academia de Futbol Valle de México</small><div><strong>Hola, Mariana</strong><span className={`${styles.action} glass-button`}>Registrar alumno →</span></div></div>
            <p className={styles.label}>Resumen</p>
            <div className={styles.metrics}>{[{ title: "Alumnos", value: "2", icon: "students" }, { title: "Equipos", value: "2", icon: "teams" }, { title: "Próximos partidos", value: "1", icon: "matches" }].map(({ title, value, icon }) => <div key={title}><PortalIcon icon={icon as NavIcon} size={16} /><span>{title}<strong>{value}</strong></span><span>→</span></div>)}</div>
            <p className={styles.label}>Accesos rápidos</p>
            <div className={styles.quick}><span>▤ Revisar pagos →</span><span>▦ Abrir calendario →</span><span>☑ Consultar asistencias →</span></div>
          </>}
          {kind === "students" && <>
            <div className={styles.titleRow}><div><strong>Alumnos</strong><small>2 alumnos registrados.</small></div><span className={`${styles.action} glass-button`}>+ Nuevo alumno</span></div>
            <div className={styles.filters}><span>⌕ Buscar por nombre o apellido…</span><span>Todas las categorías⌄</span><span>Todos los equipos⌄</span></div>
            <div className={styles.studentList}>{students.map(({ name, category, initial, status }) => <div key={name}><span className={styles.avatar}>{initial}</span><div><b>{name}</b><small>{category}</small><span className={styles.tag}>{status}</span></div><span className={styles.edit}>Editar</span></div>)}</div>
          </>}
          {kind === "coach" && <>
            <div className={styles.greeting}><small>Portal de entrenador</small><div><strong>Águilas del Valle</strong><PortalIcon icon="teams" size={26} /></div></div>
            <p className={styles.label}>Tu equipo en la cancha</p>
            <div className={styles.teamSession}><PortalIcon icon="calendar" size={20} /><div><b>Próximo entrenamiento</b><small>Sábado · 09:00 h · Cancha principal</small></div><span className={styles.tag}>Sub-12</span></div>
            <p className={styles.label}>Plantel del equipo</p>
            <div className={styles.studentList}>{students.map(({ name, initial }) => <div key={name}><span className={styles.avatar}>{initial}</span><div><b>{name}</b><small>Listo para la siguiente sesión</small></div><span className={styles.tag}>Activo</span></div>)}</div>
          </>}
          {kind === "family" && <>
            <div className={styles.mobileBrand}>◉ Escuelitas Fut</div>
            <div className={styles.greeting}><small>Portal de familias</small><strong>Hola, Mariana</strong><p>Todo sobre tus hijos, en un lugar.</p></div>
            <p className={styles.label}>Mis hijos</p>
            {students.map(({ name, category, initial }) => <div key={name} className={styles.child}><span className={styles.avatar}>{initial}</span><b>{name.split(" ").slice(0, 2).join(" ")}</b><small>{category}</small><span className={styles.tag}>Ver perfil →</span></div>)}
            <div className={styles.mobileNav}><span>⌂ Inicio</span><span>♧ Mis hijos</span><span>▤ Pagos</span></div>
          </>}
        </div>
      </div>
    </div>
  );
}
