/**
 * Sólo permite redirigir a rutas internas (evita open-redirect). Acepta el
 * valor crudo de un FormData o un string; cualquier cosa que no sea una ruta
 * interna ("/algo", nunca "//host") se reduce a "/".
 */
export function safeNext(value: FormDataEntryValue | string | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}
