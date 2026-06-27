import {
  pgTable,
  text,
  timestamp,
  integer,
  date,
  jsonb,
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
  // Cuota de inscripción por equipo (en centavos). Null = sin cuota definida.
  registrationFeeCents: integer("registration_fee_cents"),
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

export const leagueChargeStatus = pgEnum("league_charge_status", [
  "pending",
  "paid",
  "canceled",
]);

/**
 * Cargo de INSCRIPCIÓN por equipo a una temporada. Reusa la misma cuenta de
 * Stripe Connect de la organización (la liga cobra a su cuenta). Pago manual
 * (efectivo/transferencia) o en línea vía un enlace público /pagar/[id].
 */
export const leagueCharges = pgTable(
  "league_charges",
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
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("MXN"),
    status: leagueChargeStatus("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { mode: "date" }),
    stripeCheckoutId: text("stripe_checkout_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Un cargo de inscripción por equipo por temporada.
  (t) => [uniqueIndex("league_charges_season_team_uq").on(t.seasonId, t.teamId)]
);

export const leagueChargesRelations = relations(leagueCharges, ({ one }) => ({
  season: one(seasons, {
    fields: [leagueCharges.seasonId],
    references: [seasons.id],
  }),
  team: one(leagueTeams, {
    fields: [leagueCharges.teamId],
    references: [leagueTeams.id],
  }),
}));

export const leagueMatchStatus = pgEnum("league_match_status", [
  "scheduled",
  "played",
  "canceled",
]);

/**
 * Partido de liga: SIMÉTRICO (local vs visitante, ambos equipos registrados),
 * a diferencia del partido de academia ("mi equipo vs rival por texto"). El
 * marcador alimenta la tabla de posiciones (que se CALCULA, no se captura a
 * mano). `round` = jornada del calendario generado.
 */
export const leagueMatches = pgTable("league_matches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  seasonId: text("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  round: integer("round").notNull().default(1),
  homeTeamId: text("home_team_id")
    .notNull()
    .references(() => leagueTeams.id, { onDelete: "cascade" }),
  awayTeamId: text("away_team_id")
    .notNull()
    .references(() => leagueTeams.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }),
  location: text("location"),
  status: leagueMatchStatus("status").notNull().default("scheduled"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const leagueMatchesRelations = relations(
  leagueMatches,
  ({ one, many }) => ({
    season: one(seasons, {
      fields: [leagueMatches.seasonId],
      references: [seasons.id],
    }),
    homeTeam: one(leagueTeams, {
      fields: [leagueMatches.homeTeamId],
      references: [leagueTeams.id],
      relationName: "homeTeam",
    }),
    awayTeam: one(leagueTeams, {
      fields: [leagueMatches.awayTeamId],
      references: [leagueTeams.id],
      relationName: "awayTeam",
    }),
    stats: many(leagueMatchStats),
  })
);

/**
 * Estadística de un jugador en un partido de liga (Fase L5). Las claves varían
 * por deporte (futbol: goals/assists; béisbol: runs/hits/rbi; básquet:
 * points/rebounds/assists), por eso `stats` es JSON {clave: valor} según el
 * catálogo de deportes (src/lib/sports.ts), en vez de columnas fijas.
 */
export const leagueMatchStats = pgTable(
  "league_match_stats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => leagueMatches.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => rosterPlayers.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => leagueTeams.id, { onDelete: "cascade" }),
    stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("league_match_stats_match_player_uq").on(t.matchId, t.playerId),
  ]
);

export const leagueMatchStatsRelations = relations(
  leagueMatchStats,
  ({ one }) => ({
    match: one(leagueMatches, {
      fields: [leagueMatchStats.matchId],
      references: [leagueMatches.id],
    }),
    player: one(rosterPlayers, {
      fields: [leagueMatchStats.playerId],
      references: [rosterPlayers.id],
    }),
  })
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
