import Image from "next/image";

/**
 * Escudo de una escuela: su logo si lo tiene, o un círculo con su inicial.
 * Reutilizable en la página pública y en las pantallas con marca.
 */
export function SchoolCrest({
  name,
  logoUrl,
  size = 72,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Escudo de ${name}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl border border-ink/10 object-cover"
        unoptimized
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-pitch font-display font-extrabold text-chalk"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
