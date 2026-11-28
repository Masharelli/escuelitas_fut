import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { students as studentsTable } from "@/db/schema";
import { requireRole, ADMIN_ROLES } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import {
  paymentTrafficLights,
  activeDiscountsByStudent,
  scholarshipLabel,
  TRAFFIC_LIGHT_LABELS,
  type TrafficLight,
} from "@/lib/billing";
import { AddButtonLabel, PageHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { getFormOptions } from "./options";
import { StudentDirectory } from "./student-directory";

const isLight = (v: string | undefined): v is TrafficLight =>
  v === "green" || v === "yellow" || v === "red";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; team?: string; pago?: string }>;
}) {
  const { q, cat, team, pago } = await searchParams;
  const { membership } = await requireRole(ADMIN_ROLES);
  const schoolId = membership.schoolId;
  const tdb = tenantDb(schoolId);

  // ¿Hay alumnos en total? (para distinguir "sin alumnos" de "sin resultados")
  const total = await db
    .select({ value: count() })
    .from(studentsTable)
    .where(tdb.students.scope())
    .then((r) => r[0]?.value ?? 0);

  const conditions = [];
  if (cat) conditions.push(eq(studentsTable.categoryId, cat));
  if (team) conditions.push(eq(studentsTable.teamId, team));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(studentsTable.firstName, like),
        ilike(studentsTable.lastName, like),
        sql`(${studentsTable.firstName} || ' ' || ${studentsTable.lastName}) ilike ${like}`
      )!
    );
  }

  // El facade añade el filtro de escuela; aquí sólo van los filtros de búsqueda.
  const found = await tdb.students.findMany({
    where: and(...conditions),
    with: { category: true, team: true },
    orderBy: [asc(studentsTable.lastName), asc(studentsTable.firstName)],
  });

  // Semáforo de pagos para la ficha rápida y el filtro por estado.
  const [lights, scholarships] = await Promise.all([
    paymentTrafficLights(schoolId, found.map((student) => student.id)),
    activeDiscountsByStudent(schoolId),
  ]);
  const students = found
    .filter((student) => !isLight(pago) || lights.get(student.id) === pago)
    .map(({ id, firstName, lastName, photoUrl, guardianName, guardianPhone, category, team }) => {
      const light = lights.get(id);
      return {
        id, firstName, lastName, photoUrl, guardianName, guardianPhone,
        category: category?.name,
        team: team?.name,
        payment: light && { tone: light, label: TRAFFIC_LIGHT_LABELS[light] },
        scholarships: scholarships.get(id)?.map(scholarshipLabel) ?? [],
      };
    });

  const { categories, teams } = await getFormOptions(schoolId);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Alumnos"
        title="Alumnos"
        subtitle={
          total
            ? `${total} alumno${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}.`
            : "Registra a los alumnos de tu escuela."
        }
        action={
          total > 0 ? (
            <PrimaryLink href="/admin/alumnos/nuevo">
              <AddButtonLabel>Nuevo alumno</AddButtonLabel>
            </PrimaryLink>
          ) : undefined
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Aún no hay alumnos"
          description="Da de alta a tu primer alumno con sus datos, categoría y la información de su tutor."
          action={
            <PrimaryLink href="/admin/alumnos/nuevo">
              <AddButtonLabel>Registrar alumno</AddButtonLabel>
            </PrimaryLink>
          }
        />
      ) : (
        <>
          <FilterBar
            search={{ key: "q", placeholder: "Buscar por nombre o apellido…", grouped: true }}
            selects={[
              { key: "cat", label: "Filtrar por categoría", allLabel: "Todas las categorías", icon: "students", options: categories },
              { key: "team", label: "Filtrar por equipo", allLabel: "Todos los equipos", icon: "teams", options: teams },
              {
                key: "pago",
                label: "Filtrar por estado de pago",
                allLabel: "Pagos: todos",
                icon: "payments",
                options: (["green", "yellow", "red"] as const).map((l) => ({
                  value: l,
                  label:
                    (l === "green" ? "🟢 " : l === "yellow" ? "🟡 " : "🔴 ") +
                    TRAFFIC_LIGHT_LABELS[l],
                })),
              },
            ]}
          />
          {students.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-ink-soft">
              No encontramos alumnos con esos filtros.
            </p>
          ) : (
            <StudentDirectory canDelete={membership.role === "owner"} students={students} />
          )}
        </>
      )}
    </div>
  );
}
