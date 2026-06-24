import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./tenant";
import { users } from "./auth";

/**
 * Avisos (Fase 5). Una fila por destinatario (userId): el portal muestra una
 * campana con los no leídos y una lista en /avisos. Se generan por evento
 * (cuota nueva, pago recibido, resultado de partido) y, en AWS, también por un
 * cron diario (recordatorios de vencimiento y de próximos partidos).
 *
 * El correo es un canal adicional best-effort (ver src/lib/email.ts): el aviso
 * in-app es la fuente de verdad y nunca depende de que el correo se envíe.
 */
export const notificationType = pgEnum("notification_type", [
  "charge_created", // se generó una cuota/cobro
  "charge_paid", // recibo: pago recibido
  "charge_due_soon", // recordatorio: cuota por vencer (cron)
  "charge_overdue", // cuota vencida (cron)
  "match_upcoming", // partido próximo (cron)
  "match_result", // resultado publicado
  "general", // aviso libre del administrador
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    // Destinatario del aviso.
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull().default("general"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Ruta relativa a la que lleva el aviso al tocarlo (ej. "/padres/pagos").
    link: text("link"),
    // Null mientras no se ha leído.
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [notifications.schoolId],
    references: [schools.id],
  }),
}));
