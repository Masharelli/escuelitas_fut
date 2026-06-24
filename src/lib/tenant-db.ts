import { and, eq, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  charges,
  matches,
  matchPlayerStats,
  plans,
  students,
  teams,
  tournaments,
  tournamentStandings,
} from "@/db/schema";

/**
 * Acceso a datos AISLADO POR ESCUELA (tenant). Es la forma canónica —y la
 * única que deberías usar— de leer/escribir las tablas con `schoolId`. El
 * `schoolId` se hornea dentro de cada operación, así que es imposible
 * "olvidarlo" y filtrar datos de otra escuela. Cualquier `where` que pases se
 * combina con AND sobre el filtro de escuela, de modo que tampoco puedes
 * escapar del scope pasando un filtro propio.
 *
 *   const tdb = tenantDb(membership.schoolId);
 *   await tdb.students.findMany({ with: { team: true } });   // filtrado a la escuela
 *   await tdb.students.findFirst({ where: eq(students.id, id), with: { team: true } });
 *   await tdb.students.findById(id);            // fila base, null si no es de la escuela
 *   await tdb.students.insert({ ...values });    // schoolId inyectado
 *
 * `findMany`/`findFirst` conservan la inferencia de Drizzle (with/columns/etc.).
 *
 * NOTA: para tablas no scopeadas así (schools por su propio id, guardianships
 * por userId, invitaciones por token) usa sus libs dedicadas; no van aquí.
 *
 * Guardia de producción pendiente: Postgres RLS como red de seguridad a nivel
 * de base de datos cuando se despliegue (este facade es a nivel de aplicación).
 */
export function tenantDb(schoolId: string) {
  return {
    students: {
      ...makeReads(db.query.students, students, schoolId),
      insert: (values: Omit<typeof students.$inferInsert, "schoolId">) =>
        db.insert(students).values({ ...values, schoolId }),
      updateById: (id: string, values: Partial<typeof students.$inferInsert>) =>
        db.update(students).set(values).where(rowIn(students, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(students).where(rowIn(students, id, schoolId)),
    },
    teams: {
      ...makeReads(db.query.teams, teams, schoolId),
      insert: (values: Omit<typeof teams.$inferInsert, "schoolId">) =>
        db.insert(teams).values({ ...values, schoolId }),
      updateById: (id: string, values: Partial<typeof teams.$inferInsert>) =>
        db.update(teams).set(values).where(rowIn(teams, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(teams).where(rowIn(teams, id, schoolId)),
    },
    categories: {
      ...makeReads(db.query.categories, categories, schoolId),
      insert: (values: Omit<typeof categories.$inferInsert, "schoolId">) =>
        db.insert(categories).values({ ...values, schoolId }),
      updateById: (
        id: string,
        values: Partial<typeof categories.$inferInsert>
      ) =>
        db.update(categories).set(values).where(rowIn(categories, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(categories).where(rowIn(categories, id, schoolId)),
    },
    plans: {
      ...makeReads(db.query.plans, plans, schoolId),
      insert: (values: Omit<typeof plans.$inferInsert, "schoolId">) =>
        db.insert(plans).values({ ...values, schoolId }),
      updateById: (id: string, values: Partial<typeof plans.$inferInsert>) =>
        db.update(plans).set(values).where(rowIn(plans, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(plans).where(rowIn(plans, id, schoolId)),
    },
    charges: {
      ...makeReads(db.query.charges, charges, schoolId),
      insert: (values: Omit<typeof charges.$inferInsert, "schoolId">) =>
        db.insert(charges).values({ ...values, schoolId }),
      updateById: (id: string, values: Partial<typeof charges.$inferInsert>) =>
        db.update(charges).set(values).where(rowIn(charges, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(charges).where(rowIn(charges, id, schoolId)),
      /**
       * Inserta varios cargos inyectando el schoolId; ignora los que choquen
       * con el índice único (mismo alumno/plan/periodo) — idempotente para
       * "generar cargos del mes". Devuelve SOLO los cargos realmente creados
       * (los duplicados se omiten), útil para notificar únicamente lo nuevo.
       */
      insertManyIgnoringDuplicates: async (
        rows: Omit<typeof charges.$inferInsert, "schoolId">[]
      ): Promise<(typeof charges.$inferSelect)[]> =>
        rows.length
          ? db
              .insert(charges)
              .values(rows.map((r) => ({ ...r, schoolId })))
              .onConflictDoNothing()
              .returning()
          : [],
    },
    tournaments: {
      ...makeReads(db.query.tournaments, tournaments, schoolId),
      insert: (values: Omit<typeof tournaments.$inferInsert, "schoolId">) =>
        db.insert(tournaments).values({ ...values, schoolId }),
      updateById: (
        id: string,
        values: Partial<typeof tournaments.$inferInsert>
      ) =>
        db
          .update(tournaments)
          .set(values)
          .where(rowIn(tournaments, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(tournaments).where(rowIn(tournaments, id, schoolId)),
    },
    matches: {
      ...makeReads(db.query.matches, matches, schoolId),
      insert: (values: Omit<typeof matches.$inferInsert, "schoolId">) =>
        db.insert(matches).values({ ...values, schoolId }),
      updateById: (id: string, values: Partial<typeof matches.$inferInsert>) =>
        db.update(matches).set(values).where(rowIn(matches, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(matches).where(rowIn(matches, id, schoolId)),
    },
    tournamentStandings: {
      ...makeReads(db.query.tournamentStandings, tournamentStandings, schoolId),
      insert: (
        values: Omit<typeof tournamentStandings.$inferInsert, "schoolId">
      ) => db.insert(tournamentStandings).values({ ...values, schoolId }),
      updateById: (
        id: string,
        values: Partial<typeof tournamentStandings.$inferInsert>
      ) =>
        db
          .update(tournamentStandings)
          .set(values)
          .where(rowIn(tournamentStandings, id, schoolId)),
      deleteById: (id: string) =>
        db.delete(tournamentStandings).where(rowIn(tournamentStandings, id, schoolId)),
    },
    matchPlayerStats: {
      ...makeReads(db.query.matchPlayerStats, matchPlayerStats, schoolId),
      /** Reemplaza las estadísticas de un partido (borra y reinserta). */
      replaceForMatch: async (
        matchId: string,
        rows: Omit<
          typeof matchPlayerStats.$inferInsert,
          "schoolId" | "matchId"
        >[]
      ) => {
        await db
          .delete(matchPlayerStats)
          .where(
            and(
              eq(matchPlayerStats.matchId, matchId),
              eq(matchPlayerStats.schoolId, schoolId)
            )
          );
        if (rows.length) {
          await db
            .insert(matchPlayerStats)
            .values(rows.map((r) => ({ ...r, schoolId, matchId })));
        }
      },
    },
  };
}

type TenantTable =
  | typeof students
  | typeof teams
  | typeof categories
  | typeof plans
  | typeof charges
  | typeof tournaments
  | typeof matches
  | typeof matchPlayerStats
  | typeof tournamentStandings;

/** `id` + escuela: para localizar/escribir una fila concreta sin fuga. */
function rowIn(table: TenantTable, id: string, schoolId: string) {
  return and(eq(table.id, id), eq(table.schoolId, schoolId));
}

/** Combina el filtro de escuela con un `where` extra del llamador (AND). */
function scopedWhere(schoolScope: SQL, extra?: SQL): SQL | undefined {
  return extra ? and(schoolScope, extra) : schoolScope;
}

/** Builder relacional de Drizzle (db.query.X) acotado a lo que usamos. */
type RelationalQuery = {
  findMany: (config?: { where?: SQL }) => unknown;
  findFirst: (config?: { where?: SQL }) => unknown;
};

/**
 * Métodos de LECTURA scopeados a la escuela. `findMany`/`findFirst` se exponen
 * con la MISMA firma que el builder de Drizzle (`as Q["..."]`), conservando su
 * inferencia de tipos; sólo inyectamos el filtro de escuela en runtime.
 */
function makeReads<Q extends RelationalQuery, TTable extends TenantTable>(
  query: Q,
  table: TTable,
  schoolId: string
) {
  const bySchool = eq(table.schoolId, schoolId);

  return {
    /** Lista (filtrada a la escuela). Acepta with/orderBy/columns/limit/where. */
    findMany: ((config?: { where?: SQL }) =>
      query.findMany({
        ...config,
        where: scopedWhere(bySchool, config?.where),
      })) as Q["findMany"],

    /** Primera coincidencia dentro de la escuela. */
    findFirst: ((config?: { where?: SQL }) =>
      query.findFirst({
        ...config,
        where: scopedWhere(bySchool, config?.where),
      })) as Q["findFirst"],

    /**
     * Una fila base por su id, sólo si pertenece a esta escuela (null si no).
     * Para incluir relaciones usa `findFirst({ where: eq(t.id, id), with })`.
     */
    findById: (id: string): Promise<TTable["$inferSelect"] | undefined> =>
      query.findFirst({ where: rowIn(table, id, schoolId) }) as Promise<
        TTable["$inferSelect"] | undefined
      >,

    /** Filtro de escuela para queries de bajo nivel (p. ej. db.select count). */
    scope: (extra?: SQL) => scopedWhere(bySchool, extra),
  };
}
