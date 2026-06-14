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
}));
