/**
 * Marcas de la cancha dibujadas con "cal" como fondo decorativo: línea de medio
 * campo, círculo central y los arcos de las áreas. Se posiciona de forma
 * absoluta y muy tenue; el contenedor padre debe tener `overflow-hidden`.
 */
export function PitchBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 text-pitch/[0.10] ${className}`}
      viewBox="0 0 1000 700"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <line
        x1="500"
        y1="40"
        x2="500"
        y2="660"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle cx="500" cy="350" r="150" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="500" cy="350" r="6" fill="currentColor" />
      <path
        d="M40 230 A150 150 0 0 1 40 470"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M960 230 A150 150 0 0 0 960 470"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}
