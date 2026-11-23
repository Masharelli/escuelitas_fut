import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Guarda una imagen y devuelve la ruta de la app que controla su lectura.
 *
 * En Supabase usa Storage; sin configuración, solo permite archivos locales
 * durante desarrollo. Los permisos se comprueban en las acciones que la llaman.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
// ponytail: 4 MB por Server Action; subir directo a Storage si se necesitan archivos mayores.
const MAX_BYTES = 4 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function saveImage(
  file: File,
  prefix = "img"
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    throw new Error("Formato no permitido. Usa PNG, JPG o WEBP.");
  }
  if (!file.size || file.size > MAX_BYTES) {
    throw new Error("La imagen debe tener contenido y no pesar más de 4 MB.");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error("Nombre de imagen inválido.");

  const filename = `${prefix}_${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url || key) {
    if (!url || !key) throw new Error("Falta configurar Supabase Storage.");
    let response: Response;
    try {
      response = await fetch(`${url}/storage/v1/object/images/${filename}`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": file.type, "Cache-Control": "max-age=31536000" },
        body: buffer,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error("No se pudo conectar con el almacenamiento de imágenes.");
    }
    if (!response.ok) throw new Error("No se pudo guardar la imagen. Intenta de nuevo.");
    return `/api/images/${filename}`;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Falta configurar Supabase Storage.");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

/** True si el FormData trae un archivo con contenido en ese campo. */
export function hasUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
