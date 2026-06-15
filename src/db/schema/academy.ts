import {
  pgTable,
  text,
  timestamp,
  integer,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { users } from "./auth";

/**
 * Estructura deportiva de una escuela:
 *   Categoría (ej. "2015" / "Sub-10")  →  Equipo  →  Alumno
 * Todo se aísla por `schoolId`.
 */

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Año de nacimiento de la categoría (opcional, ej. 2015)
    birthYear: integer("birth_year"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("categories_school_name_uq").on(t.schoolId, t.name)]
);

export const teams = pgTable("teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const studentStatus = pgEnum("student_status", ["active", "inactive"]);

export const students = pgTable("students", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: date("birth_date", { mode: "string" }),
  photoUrl: text("photo_url"),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  // Datos personales / de inscripción
  sex: text("sex"), // masculino | femenino | otro
  nationality: text("nationality"),
  curp: text("curp"),
  address: text("address"),
  city: text("city"),
  school: text("school"), // colegio donde estudia
  // Datos deportivos
  position: text("position"),
  dominantFoot: text("dominant_foot"), // derecho | izquierdo | ambidiestro
  jerseySize: text("jersey_size"),
  // Datos médicos / emergencia
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  // Datos del tutor (papá/mamá) — se vincularán a cuentas de padres en Fase 2
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianEmail: text("guardian_email"),
  notes: text("notes"),
  status: studentStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Vínculo papá/mamá (usuario) ↔ alumno. Se crea automáticamente cuando un
 * usuario se registra/inicia sesión con el mismo correo que el tutor del
 * alumno (ver `src/lib/guardians.ts`).
 */
export const guardianships = pgTable(
  "guardianships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("guardianships_user_student_uq").on(t.userId, t.studentId)]
);

export const guardianshipsRelations = relations(guardianships, ({ one }) => ({
  user: one(users, {
    fields: [guardianships.userId],
    references: [users.id],
  }),
  student: one(students, {
    fields: [guardianships.studentId],
    references: [students.id],
  }),
}));

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
]);

/**
 * Invitación que el admin genera para un alumno. Produce un enlace
 * (`/invitacion/{token}`) que se comparte con el tutor; al abrirlo y entrar
 * (registro o inicio de sesión) queda vinculado a ESE alumno, sin depender de
 * que el correo coincida. El `email` es solo de referencia para el admin.
 */
export const guardianInvitations = pgTable("guardian_invitations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email"),
  status: invitationStatus("status").notNull().default("pending"),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const guardianInvitationsRelations = relations(
  guardianInvitations,
  ({ one }) => ({
    student: one(students, {
      fields: [guardianInvitations.studentId],
      references: [students.id],
    }),
    school: one(schools, {
      fields: [guardianInvitations.schoolId],
      references: [schools.id],
    }),
    acceptedBy: one(users, {
      fields: [guardianInvitations.acceptedByUserId],
      references: [users.id],
    }),
  })
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  school: one(schools, {
    fields: [categories.schoolId],
    references: [schools.id],
  }),
  teams: many(teams),
  students: many(students),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  category: one(categories, {
    fields: [teams.categoryId],
    references: [categories.id],
  }),
  students: many(students),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  category: one(categories, {
    fields: [students.categoryId],
    references: [categories.id],
  }),
  team: one(teams, {
    fields: [students.teamId],
    references: [teams.id],
  }),
  // OJO: se llama "tenant" y no "school" para no chocar con la columna de
  // texto `school` (el colegio donde estudia el alumno).
  tenant: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
}));
