import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { teams, students, categories } from "./academy";

/**
 * Competición (Fase 4): partidos de los equipos de la escuela, opcionalmente
 * agrupados en torneos/ligas, con estadísticas por jugador. Todo se aísla por
 * `schoolId`.
 *
 *   tournaments         → liga/torneo (agrupador opcional de partidos) — UI en 4b
 *   matches             → partido de UN equipo nuestro vs un rival
 *   match_player_stats  → goles/asistencias por alumno en un partido
 *
 * Rival: se guarda el nombre (`opponentName`). Si el rival es otra escuela de
 * la plataforma, `rivalSchoolId` la enlaza (sincronización cross-tenant = 4c).
 */

export const tournamentFormat = pgEnum("tournament_format", [
  "league", // liga (todos contra todos, tabla por puntos)
  "cup", // copa / eliminatoria
  "friendly", // amistosos
]);

export const tournamentStatus = pgEnum("tournament_status", [
  "upcoming",
  "active",
  "finished",
]);

export const tournaments = pgTable("tournaments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: tournamentFormat("format").notNull().default("league"),
  // Categoría a la que pertenece el torneo (opcional).
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  startsOn: date("starts_on", { mode: "string" }),
  endsOn: date("ends_on", { mode: "string" }),
  status: tournamentStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const matchStatus = pgEnum("match_status", [
  "scheduled", // programado
  "played", // jugado (con marcador)
  "canceled", // cancelado
  "postponed", // pospuesto
]);

export const matches = pgTable("matches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  // Torneo al que pertenece (opcional: puede ser un amistoso suelto).
  tournamentId: text("tournament_id").references(() => tournaments.id, {
    onDelete: "set null",
  }),
  // Nuestro equipo en este partido.
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  // Rival: nombre libre; si es otra escuela del sistema, se enlaza (4c).
  opponentName: text("opponent_name").notNull(),
  rivalSchoolId: text("rival_school_id").references(() => schools.id, {
    onDelete: "set null",
  }),
  isHome: boolean("is_home").notNull().default(true),
  kickoffAt: timestamp("kickoff_at", { mode: "date" }).notNull(),
  location: text("location"),
  status: matchStatus("status").notNull().default("scheduled"),
  // Marcador desde NUESTRA perspectiva (null hasta que se juega).
  ourScore: integer("our_score"),
  opponentScore: integer("opponent_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const matchPlayerStats = pgTable(
  "match_player_stats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Una fila de estadística por alumno por partido.
  (t) => [
    uniqueIndex("match_player_stats_match_student_uq").on(
      t.matchId,
      t.studentId
    ),
  ]
);

/**
 * Tabla de posiciones de un torneo. El admin la mantiene a mano (las ligas
 * externas publican sus resultados; el admin los sube aquí). Una fila por
 * equipo participante; los puntos se calculan (3·G + 1·E) al mostrar.
 */
export const tournamentStandings = pgTable("tournament_standings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  teamName: text("team_name").notNull(),
  // ¿Es el equipo de esta escuela? (para resaltarlo en la tabla)
  isOurs: boolean("is_ours").notNull().default(false),
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  drawn: integer("drawn").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const tournamentsRelations = relations(
  tournaments,
  ({ one, many }) => ({
    school: one(schools, {
      fields: [tournaments.schoolId],
      references: [schools.id],
    }),
    category: one(categories, {
      fields: [tournaments.categoryId],
      references: [categories.id],
    }),
    matches: many(matches),
    standings: many(tournamentStandings),
  })
);

export const tournamentStandingsRelations = relations(
  tournamentStandings,
  ({ one }) => ({
    tournament: one(tournaments, {
      fields: [tournamentStandings.tournamentId],
      references: [tournaments.id],
    }),
  })
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  team: one(teams, {
    fields: [matches.teamId],
    references: [teams.id],
  }),
  // Rival enlazado a otra escuela (cuando aplique, 4c).
  rivalSchool: one(schools, {
    fields: [matches.rivalSchoolId],
    references: [schools.id],
  }),
  playerStats: many(matchPlayerStats),
}));

export const matchPlayerStatsRelations = relations(
  matchPlayerStats,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchPlayerStats.matchId],
      references: [matches.id],
    }),
    student: one(students, {
      fields: [matchPlayerStats.studentId],
      references: [students.id],
    }),
  })
);
