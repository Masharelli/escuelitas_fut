import {
  pgTable,
  text,
  timestamp,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { categories } from "./academy";

/**
 * Gastos operativos (Fase G, módulo Premium). Cada gasto puede asociarse a una
 * categoría deportiva (`categoryId`) para calcular rentabilidad por categoría:
 * ingresos de los alumnos de esa categoría menos sus gastos.
 */
export const expenseCategory = pgEnum("expense_category", [
  "nomina", // nómina de entrenadores
  "arbitraje", // arbitrajes
  "renta_campo", // renta de campos
  "material", // material deportivo
  "viaje", // viajes
  "uniforme", // uniformes
  "otro", // otro
]);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    category: expenseCategory("category").notNull().default("otro"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("MXN"),
    // Fecha del gasto (YYYY-MM-DD).
    spentOn: date("spent_on", { mode: "string" }).notNull(),
    // Categoría deportiva a la que se imputa (opcional, para rentabilidad).
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("expenses_school_spent_idx").on(t.schoolId, t.spentOn)]
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  school: one(schools, {
    fields: [expenses.schoolId],
    references: [schools.id],
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
}));
