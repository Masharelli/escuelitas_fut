import { eq } from "drizzle-orm";

import { db } from "@/db";
import { schools } from "@/db/schema";

/**
 * Datos PÚBLICOS de una escuela por su slug (para la página `/e/[slug]` y el
 * branding de las pantallas de auth). Devuelve sólo columnas que es seguro
 * mostrar sin sesión — nunca datos sensibles como `stripeAccountId`.
 */
export async function getSchoolBySlug(slug: string) {
  return db.query.schools.findFirst({
    where: eq(schools.slug, slug),
    columns: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      sport: true,
      logoUrl: true,
      description: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      primaryColor: true,
    },
  });
}

export type PublicSchool = NonNullable<
  Awaited<ReturnType<typeof getSchoolBySlug>>
>;
