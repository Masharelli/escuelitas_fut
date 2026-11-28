"use client";

import Link from "next/link";
import { useState } from "react";

import { StudentAvatar } from "@/components/student-avatar";
import { Card } from "@/components/ui";
import type { TrafficLight } from "@/lib/billing";
import { deleteStudent } from "./actions";

type DirectoryStudent = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  category?: string;
  team?: string;
  payment?: { tone: TrafficLight; label: string };
  scholarships: string[];
};

const paymentStyles: Record<TrafficLight, { badge: string; dot: string }> = {
  green: { badge: "bg-primary-container text-on-primary-container", dot: "bg-pitch" },
  yellow: { badge: "bg-tertiary-container text-on-tertiary-container", dot: "bg-amber-600" },
  red: { badge: "bg-red-100 text-red-800", dot: "bg-red-600" },
};

export function StudentDirectory({ students, canDelete }: { students: DirectoryStudent[]; canDelete: boolean }) {
  const [selectedId, setSelectedId] = useState<string>();
  const selectedStudent = students.find(({ id }) => id === selectedId) ?? students[0];
  if (!selectedStudent) return null;

  return (
    <Card padded={false} className="@container overflow-hidden">
      <h2 className="border-b border-outline-variant bg-surface-container px-4 py-3 font-display text-xl font-bold sm:px-6">
        Directorio
      </h2>
      <div className="grid @min-[43rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="min-w-0 divide-y divide-outline-variant @min-[43rem]:max-h-[29rem] @min-[43rem]:overflow-y-auto @min-[43rem]:overscroll-contain">
          {students.map((student) => {
            const selected = student.id === selectedStudent.id;
            const assignment = [student.team, student.category].filter(Boolean).join(" · ") || "Sin asignar";
            return (
              <li key={student.id}>
                <button
                  type="button"
                  data-plain
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setSelectedId(student.id)}
                  className="flex w-full cursor-pointer items-center gap-3 border-l-4 border-transparent py-3 pr-3 pl-2 text-left transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pitch aria-[current=true]:border-l-pitch aria-[current=true]:bg-primary-container/65 sm:pr-4 sm:pl-4"
                >
                  <StudentAvatar name={student.firstName} surname={student.lastName} photoUrl={student.photoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{student.firstName} {student.lastName}</span>
                    <span className="mt-1 block text-sm leading-snug text-ink-soft">{assignment}</span>
                  </span>
                  <span className={selected ? "rotate-90 text-pitch @min-[43rem]:rotate-0" : "text-ink-soft"}>
                    <Chevron />
                  </span>
                </button>
                {selected && (
                  <div className="border-t border-outline-variant @min-[43rem]:hidden">
                    <QuickProfile student={selectedStudent} canDelete={canDelete} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="hidden min-w-0 border-l border-outline-variant @min-[43rem]:block">
          <QuickProfile student={selectedStudent} canDelete={canDelete} />
        </div>
      </div>
    </Card>
  );
}

function QuickProfile({ student, canDelete }: { student: DirectoryStudent; canDelete: boolean }) {
  const name = `${student.firstName} ${student.lastName}`;
  const assignment = [student.team, student.category].filter(Boolean).join(" · ") || "Sin asignar";
  const profilePath = `/admin/alumnos/${student.id}`;
  const payment = student.payment;
  const paymentStyle = payment && paymentStyles[payment.tone];

  return (
    <section aria-label="Ficha rápida" className="p-4 sm:p-6 @min-[43rem]:p-7">
      <header className="flex flex-wrap items-start gap-3 sm:gap-4">
        <StudentAvatar name={student.firstName} surname={student.lastName} photoUrl={student.photoUrl} large />
        <div className="min-w-0 flex-[1_1_9rem] self-center">
          <h3 className="font-display text-2xl leading-tight font-extrabold tracking-tight @min-[54rem]:text-3xl">{name}</h3>
          <p className="mt-1 text-sm text-ink-soft">{assignment}</p>
        </div>
        <Link
          href={`${profilePath}/editar`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-3 text-sm font-semibold text-pitch hover:bg-primary-container"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m14.5 5.5 4 4m-13 4L16.8 2.2a1.8 1.8 0 0 1 2.5 0l2.5 2.5a1.8 1.8 0 0 1 0 2.5L10.5 18.5l-6 1 1-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Editar
        </Link>
      </header>

      <dl className="mt-5 divide-y divide-outline-variant border-y border-outline-variant text-sm">
        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-baseline gap-2 py-3.5">
          <dt className="font-semibold">Estado de pago</dt>
          <dd className="text-ink-soft">
            {payment && paymentStyle ? (
              <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-semibold ${paymentStyle.badge}`}>
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${paymentStyle.dot}`} />
                {payment.label}
              </span>
            ) : "Sin información"}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-baseline gap-2 py-3.5">
          <dt className="font-semibold">Beca</dt>
          <dd className="flex flex-wrap gap-1.5 text-ink-soft">
            {student.scholarships.length ? student.scholarships.map((label, index) => (
              <span key={`${label}-${index}`} className="rounded-lg bg-surface-container px-2.5 py-1 font-medium">{label}</span>
            )) : "Sin beca"}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-baseline gap-2 py-3.5">
          <dt className="font-semibold">Tutor</dt>
          <dd>
            {student.guardianName || (!student.guardianPhone && "Sin tutor registrado")}
            {student.guardianPhone && <span className="block text-ink-soft">{student.guardianPhone}</span>}
          </dd>
        </div>
      </dl>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Link href={profilePath} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-pitch underline-offset-4 hover:underline">
          Ver ficha completa <Chevron />
        </Link>
        {canDelete && (
          <form action={deleteStudent}>
            <input type="hidden" name="id" value={student.id} />
            <button
              type="submit"
              data-plain
              aria-label={`Eliminar a ${name}`}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 14h10l1-14M10 11v6m4-6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </footer>
    </section>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
