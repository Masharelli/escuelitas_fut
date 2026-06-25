import {
  pgTable,
  text,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";

/**
 * Entidades de LIGA (Fase L2). Solo aplican a tenants `kind = league`. Todo se
 * aísla por `schoolId` (la organización = la liga).
 *
 *   league_teams   → equipo participante INDEPENDIENTE (con su capitán/contacto)
 *   roster_players → roster ligero del equipo (nombre + dorsal)
 *   seasons        → temporada / torneo de la liga
 *   season_teams   → inscripción de un equipo a una temporada (M:N)
 *
 * A diferencia de la academia, los equipos no cuelgan de categorías ni los
 * jugadores son alumnos con tutor; son participantes externos que la liga
 * registra. El calendario, los resultados y la tabla llegan en L3.
 */

export const seasonStatus = pgEnum("season_status", [
  "upcoming",
  "active",
  "finished",
]);

export const seasons = pgTable("seasons", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: seasonStatus("status").notNull().default("active"),
  startsOn: date("starts_on", { mode: "string" }),
  endsOn: date("ends_on", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const leagueTeams = pgTable("league_teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  logoUrl: text("logo_url"),
  // Contacto del responsable del equipo (capitán/delegado).
  managerName: text("manager_name"),
  managerPhone: text("manager_phone"),
  managerEmail: text("manager_email"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const rosterPlayers = pgTable("roster_players", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => leagueTeams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Dorsal como texto (admite "00", "10", etc.).
  number: text("number"),
  position: text("position"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const seasonTeams = pgTable(
  "season_teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => leagueTeams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Un equipo no se inscribe dos veces a la misma temporada.
  (t) => [uniqueIndex("season_teams_season_team_uq").on(t.seasonId, t.teamId)]
);

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  school: one(schools, {
    fields: [seasons.schoolId],
    references: [schools.id],
  }),
  seasonTeams: many(seasonTeams),
}));

export const leagueTeamsRelations = relations(leagueTeams, ({ one, many }) => ({
  school: one(schools, {
    fields: [leagueTeams.schoolId],
    references: [schools.id],
  }),
  roster: many(rosterPlayers),
  seasonTeams: many(seasonTeams),
}));

export const rosterPlayersRelations = relations(rosterPlayers, ({ one }) => ({
  team: one(leagueTeams, {
    fields: [rosterPlayers.teamId],
    references: [leagueTeams.id],
  }),
}));

export const seasonTeamsRelations = relations(seasonTeams, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonTeams.seasonId],
    references: [seasons.id],
  }),
  team: one(leagueTeams, {
    fields: [seasonTeams.teamId],
    references: [leagueTeams.id],
  }),
}));
