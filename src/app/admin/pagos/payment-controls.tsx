"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { AddButtonLabel } from "@/components/ui";
import { CreateOneOffChargeForm } from "./forms";

type Option = { value: string; label: string };

export function CobroDialog({ categories, students }: { categories: Option[]; students: Option[] }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="md-button md-filled" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <AddButtonLabel>Cobro único</AddButtonLabel>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cobro-unico-title"
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-outline-variant bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/45 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="cobro-unico-title" className="font-display text-xl font-extrabold">Cobro único</h2>
            <p className="mt-1 text-sm text-ink-soft">Crea un cargo de inscripción, torneo o producto.</p>
          </div>
          <button type="button" aria-label="Cerrar" className="md-icon-button" onClick={() => dialog.current?.close()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <CreateOneOffChargeForm categories={categories} students={students} />
      </dialog>
    </>
  );
}

export function PaymentMonthField({ period, label, filters }: { period: string; label: string; filters: string }) {
  const router = useRouter();
  const [value, setValue] = useState(period);

  return (
    <label className="flex min-w-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-3">
      <PortalIcon icon="calendar" size={18} />
      <input
        type="month"
        lang="es-MX"
        min="1000-01"
        max="9999-12"
        aria-label={`Mes de cobro, ${label}`}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setValue(next);
          if (!next || !event.currentTarget.validity.valid || next === period) return;
          const query = new URLSearchParams(filters);
          query.set("mes", next);
          router.push(`/admin/pagos?${query}`);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.value || !event.currentTarget.validity.valid) setValue(period);
        }}
        className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pitch sm:text-sm"
      />
    </label>
  );
}
