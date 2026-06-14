import Link from "next/link";

/**
 * Marca de Escuelitas Fut: un disco/círculo central (motivo de la cancha) + el
 * nombre. Si `href` es null se renderiza sin enlace (útil cuando ya estás en
 * esa página). `size` controla la escala del logo.
 */
export function Wordmark({
  size = "md",
  href = "/",
}: {
  size?: "md" | "lg";
  href?: string | null;
}) {
  const mark = size === "lg" ? 32 : 26;
  const textClass = size === "lg" ? "text-xl" : "text-lg";

  const content = (
    <span className="flex items-center gap-2.5">
      <svg width={mark} height={mark} viewBox="0 0 26 26" aria-hidden="true">
        <circle
          cx="13"
          cy="13"
          r="12"
          fill="none"
          stroke="var(--color-pitch)"
          strokeWidth="2"
        />
        <circle cx="13" cy="13" r="2.4" fill="var(--color-pitch)" />
      </svg>
      <span className={`font-display ${textClass} font-extrabold tracking-tight`}>
        Escuelitas <span className="text-pitch">Fut</span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
    >
      {content}
    </Link>
  );
}
