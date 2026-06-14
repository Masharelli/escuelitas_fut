import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Guarda una imagen subida y devuelve su URL pública.
 *
 * Por ahora escribe en `public/uploads` (desarrollo local). El resto de la app
 * solo usa la URL que devuelve esta función, así que cuando despleguemos a AWS
 * basta con reescribir aquí para subir a S3 (y devolver la URL de CloudFront)
 * sin tocar el resto del código.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
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
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no debe pesar más de 5 MB.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${prefix}_${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

/** True si el FormData trae un archivo con contenido en ese campo. */
export function hasUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
