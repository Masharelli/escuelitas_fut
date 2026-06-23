import type { CSSProperties } from "react";

/**
 * Aplica el color de marca de una escuela sobre el sistema de diseño:
 * sobreescribe el token `--color-pitch` (y su variante oscura) para el subárbol,
 * de modo que todas las utilidades `pitch` (botones, acentos, enlaces) tomen el
 * color de la escuela. Usa `display: contents` para no alterar el layout.
 *
 * Si la escuela no definió color, no hace nada (deja la marca por defecto).
 */
export function TenantTheme({
  primaryColor,
  children,
}: {
  primaryColor?: string | null;
  children: React.ReactNode;
}) {
  if (!primaryColor) return <>{children}</>;

  const style = {
    display: "contents",
    "--color-pitch": primaryColor,
    "--color-pitch-deep": primaryColor,
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
