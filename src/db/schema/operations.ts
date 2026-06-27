import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { users } from "./auth";
import { teams, students, invitationStatus } from "./academy";
import { matches } from "./matches";

/**
 * Control operativo (Fase A): sesiones (entrenamientos / eventos) de un equipo
 * y el pase de lista (asistencia) de sus alumnos. Todo se aísla por `schoolId`.
 *
 *   trainingSessions → entrenamiento o evento de UN equipo, en una fecha/hora
 *   attendance       → estado de asistencia de UN alumno en UNA sesión
 *
 * El % de asistencia de un alumno/equipo se calcula al mostrar (no se guarda).
 *
 * OJO: se llama `trainingSessions` (tabla "training_sessions") para no chocar
 * con la tabla `sessions` de NextAuth (auth.ts).
 */

export const sessionKind = pgEnum("session_kind", [
  "training", // entrenamiento
  "event", // otro evento (clínica, convivencia, etc.)
]);

export const trainingSessions = pgTable(
  "training_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    kind: sessionKind("kind").notNull().default("training"),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
    location: text("location"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("training_sessions_team_starts_idx").on(t.teamId, t.startsAt)]
);

export const attendanceStatus = pgEnum("attendance_status", [
  "present", // presente
  "absent", // ausente
  "late", // retardo
  "excused", // falta justificada
]);

export const attendance = pgTable(
  "attendance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull().default("present"),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  // Una fila de asistencia por alumno por sesión.
  (t) => [
    uniqueIndex("attendance_session_student_uq").on(t.sessionId, t.studentId),
  ]
);

export const trainingSessionsRelations = relations(
  trainingSessions,
  ({ one, many }) => ({
    school: one(schools, {
      fields: [trainingSessions.schoolId],
      references: [schools.id],
    }),
    team: one(teams, {
      fields: [trainingSessions.teamId],
      references: [teams.id],
    }),
    attendance: many(attendance),
  })
);

export const attendanceRelations = relations(attendance, ({ one }) => ({
  session: one(trainingSessions, {
    fields: [attendance.sessionId],
    references: [trainingSessions.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

/**
 * Convocatorias + confirmación de asistencia (RSVP, Fase C). Una fila vincula a
 * UN alumno con UN evento: un partido (`matchId`) o una sesión (`sessionId`),
 * nunca ambos. El tutor responde si asistirá (`rsvp`).
 *
 * Los índices únicos usan que en Postgres los NULL son distintos: una fila de
 * convocatoria a sesión (matchId = null) no choca con otra en el índice de
 * partido, y viceversa.
 */
export const rsvpStatus = pgEnum("rsvp_status", [
  "pending", // sin respuesta del tutor
  "yes", // asistirá
  "no", // no asistirá
]);

export const callups = pgTable(
  "callups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    matchId: text("match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    sessionId: text("session_id").references(() => trainingSessions.id, {
      onDelete: "cascade",
    }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    rsvp: rsvpStatus("rsvp").notNull().default("pending"),
    respondedAt: timestamp("responded_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("callups_match_student_uq").on(t.matchId, t.studentId),
    uniqueIndex("callups_session_student_uq").on(t.sessionId, t.studentId),
  ]
);

export const callupsRelations = relations(callups, ({ one }) => ({
  match: one(matches, {
    fields: [callups.matchId],
    references: [matches.id],
  }),
  session: one(trainingSessions, {
    fields: [callups.sessionId],
    references: [trainingSessions.id],
  }),
  student: one(students, {
    fields: [callups.studentId],
    references: [students.id],
  }),
}));

/**
 * Asignación entrenador ↔ equipo (Fase F). El entrenador (`userId` con
 * membresía coach en la escuela) solo gestiona los equipos que tenga asignados.
 */
export const coachTeams = pgTable(
  "coach_teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coach_teams_user_team_uq").on(t.userId, t.teamId)]
);

export const coachTeamsRelations = relations(coachTeams, ({ one }) => ({
  user: one(users, { fields: [coachTeams.userId], references: [users.id] }),
  team: one(teams, { fields: [coachTeams.teamId], references: [teams.id] }),
}));

/**
 * Invitación de entrenador: el admin genera un enlace para que el coach entre
 * (registro o login) y quede vinculado a la escuela con rol coach y, si se
 * indicó, asignado a un equipo. Reutiliza el enum `invitationStatus`.
 */
export const staffInvitations = pgTable("staff_invitations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  email: text("email"),
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  status: invitationStatus("status").notNull().default("pending"),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const staffInvitationsRelations = relations(
  staffInvitations,
  ({ one }) => ({
    school: one(schools, {
      fields: [staffInvitations.schoolId],
      references: [schools.id],
    }),
    team: one(teams, {
      fields: [staffInvitations.teamId],
      references: [teams.id],
    }),
    acceptedBy: one(users, {
      fields: [staffInvitations.acceptedByUserId],
      references: [users.id],
    }),
  })
);

/**
 * Eventos en vivo de un partido (Fase F, "papá estadístico"). Cada gol/tarjeta
 * con su minuto alimenta el seguimiento en tiempo real para los tutores. El
 * marcador parcial se calcula contando goles (nuestros vs. del rival).
 */
export const matchEventType = pgEnum("match_event_type", [
  "goal", // gol nuestro
  "goal_opponent", // gol del rival
  "yellow", // tarjeta amarilla (nuestra)
  "red", // tarjeta roja (nuestra)
]);

export const matchEvents = pgTable(
  "match_events",
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
    type: matchEventType("type").notNull(),
    minute: integer("minute"),
    // Alumno relacionado (goleador / amonestado). Null para goles del rival.
    studentId: text("student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("match_events_match_idx").on(t.matchId, t.createdAt)]
);

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  match: one(matches, {
    fields: [matchEvents.matchId],
    references: [matches.id],
  }),
  student: one(students, {
    fields: [matchEvents.studentId],
    references: [students.id],
  }),
}));
