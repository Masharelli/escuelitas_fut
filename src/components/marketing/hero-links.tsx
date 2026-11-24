import Image from "next/image";

import { PortalIcon } from "@/components/portal/portal-icon";
import adminPanel from "../../../public/recorrido/panel.webp";
import styles from "./landing.module.css";

const socialNetworks = [
  {
    name: "Facebook",
    icon: <path fill="currentColor" d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4V10H8v3h2.9v8H14Z" />,
  },
  {
    name: "Instagram",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" />
      </>
    ),
  },
  {
    name: "X",
    icon: <path fill="currentColor" d="M18.9 2H22l-6.9 7.9L23 22h-6.2l-4.9-7.3L5.5 22H2.3l7.9-9L2 2h6.3l4.4 6.6L18.9 2ZM18 20h1.8L7.1 4H5.2L18 20Z" />,
  },
  {
    name: "TikTok",
    icon: <path fill="currentColor" d="M14.2 3h3a4.7 4.7 0 0 0 4.2 4.2v3.1a8 8 0 0 1-4.2-1.4v6.4a5.7 5.7 0 1 1-5.7-5.7l.9.1v3.1l-.9-.1a2.6 2.6 0 1 0 2.7 2.6V3Z" />,
  },
];

export function HeroLinks() {
  return (
    <>
      <div className={`${styles.floatIn} relative z-10 -mt-7 grid min-w-0 gap-3 px-5 pb-3 sm:grid-cols-2 sm:items-end sm:px-9 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:flex lg:flex-col lg:items-end lg:self-end lg:pr-9 lg:pb-9 xl:flex-row xl:justify-end xl:pr-12`}>
        <div className="min-w-0 lg:shrink-0">
          <p id="portada-redes" className="mb-2 px-1 text-xs font-semibold text-white drop-shadow-sm">Redes sociales</p>
          <ul aria-labelledby="portada-redes" className="flex flex-wrap gap-1.5 lg:flex-col lg:items-end">
            {socialNetworks.map(({ name, icon }) => (
              <li key={name}>
                <span
                  className={`${styles.floating} inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/25 px-2 text-xs font-semibold text-white sm:px-4 sm:text-sm`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 shrink-0 text-primary-container">{icon}</svg>
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="#familias"
          className={`${styles.floating} group flex min-w-0 items-start gap-3 rounded-2xl border border-white/25 p-3.5 focus-visible:outline-primary-container sm:p-4 lg:max-w-60`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <PortalIcon icon="kids" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold text-white">Portal de familias</span>
            <span className="mt-1 block text-sm leading-snug text-chalk">Horarios, resultados y pagos de cada hijo.</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-primary-container motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5">↓</span>
        </a>
      </div>

      <div className={`${styles.floatIn} relative z-10 min-w-0 px-5 pb-5 sm:px-9 lg:col-start-1 lg:row-start-2 lg:pb-9 xl:pl-15`}>
        <a
          href="#administracion"
          className={`${styles.floating} group flex min-w-0 max-w-md items-center gap-3 rounded-2xl border border-white/25 p-2.5 focus-visible:outline-primary-container sm:gap-4 sm:p-3`}
        >
          <Image src={adminPanel} alt="" unoptimized className="h-auto w-24 shrink-0 rounded-lg border border-white/20 sm:w-36" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-tight font-bold text-white">Panel de la escuela</span>
            <span className="mt-1 block text-xs leading-snug text-chalk sm:text-sm">Alumnos, equipos y pagos.</span>
          </span>
          <span aria-hidden="true" className="shrink-0 pr-1 text-primary-container motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5">↓</span>
        </a>
      </div>
    </>
  );
}
