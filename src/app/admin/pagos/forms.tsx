"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createPlan,
  createOneOffCharge,
  createDiscount,
  generateCharges,
  type FormState,
} from "./actions";
import { TextField, SelectField, TextareaField } from "@/components/form/fields";
import { SubmitButton } from "@/components/submit-button";

function ErrorMsg({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

type Option = { value: string; label: string };

const KIND_OPTIONS: Option[] = [
  { value: "monthly", label: "Cuota mensual" },
  { value: "enrollment", label: "Inscripción" },
  { value: "event", label: "Evento / torneo" },
  { value: "product", label: "Producto" },
];

export function CreatePlanForm({ categories, plan }: { categories: Option[]; plan?: { id: string; name: string; kind: string; amountCents: number; categoryId: string | null; description: string | null; annualRenewalStartsOn: string | null } }) {
  const [state, action] = useActionState<FormState, FormData>(
    createPlan,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !plan) ref.current?.reset();
  }, [state, plan]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <TextField defaultValue={plan?.name} label="Nombre del plan" name="name" placeholder="Ej. Mensualidad Sub-10" />
      <SelectField label="Tipo de cobro" name="kind" defaultValue={plan?.kind} options={KIND_OPTIONS} required />
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="annualRenewal" defaultChecked={!!plan?.annualRenewalStartsOn} className="mt-1 accent-pitch" />
        <span>Renovar cada año (planes de inscripción)</span>
      </label>
      <TextField
        label="Monto (MXN)"
        name="amount"
        defaultValue={plan ? String(plan.amountCents / 100) : undefined}
        type="number"
        step="0.01"
        placeholder="500.00"
      />
      <SelectField
        label="Categoría (opcional)"
        name="categoryId"
        defaultValue={plan?.categoryId ?? ""}
        options={categories}
        placeholder={categories.length ? "Aplica a toda la escuela" : "Crea una categoría primero"}
        hint="Si eliges una categoría, la cuota aplica solo a esos alumnos."
      />
      <TextareaField
        label="Descripción (opcional)"
        name="description"
        defaultValue={plan?.description ?? ""}
        rows={2}
        placeholder="Detalles del plan…"
      />
      <ErrorMsg state={state} />
      {state?.ok && plan && <p role="status" className="text-sm text-pitch">Precio actualizado para los próximos cargos.</p>}
      <SubmitButton>{plan ? "Guardar cambios" : "Agregar plan"}</SubmitButton>
    </form>
  );
}

/** Alta de beca/promoción: descuento porcentual (beca 100% = gratis) o fijo. */
export function CreateDiscountForm({ discount }: { discount?: { id: string; name: string; kind: string; value: number } }) {
  const [state, action] = useActionState<FormState, FormData>(
    createDiscount,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState(discount?.kind ?? "percent");
  useEffect(() => {
    if (state?.ok && !discount) ref.current?.reset();
  }, [state, discount]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      {discount && <input type="hidden" name="id" value={discount.id} />}
      <TextField
        defaultValue={discount?.name}
        label="Nombre"
        name="name"
        placeholder="Ej. Beca deportiva / Promo hermanos"
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Tipo</span>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        >
          <option value="percent">Porcentaje de descuento</option>
          <option value="fixed">Monto fijo de descuento</option>
        </select>
      </label>
      <TextField
        label={kind === "percent" ? "Descuento (%)" : "Descuento (MXN)"}
        name="value"
        defaultValue={discount ? String(discount.kind === "fixed" ? discount.value / 100 : discount.value) : undefined}
        type="number"
        step={kind === "fixed" ? "0.01" : "1"}
        placeholder={kind === "percent" ? "50 (100 = beca completa)" : "200.00"}
      />
      {state?.ok && <p role="status" className="text-sm text-pitch">{discount ? "Beca/promoción actualizada ✓" : "Beca/promoción creada ✓"}</p>}
      <ErrorMsg state={state} />
      <SubmitButton>{discount ? "Guardar cambios" : "Crear beca/promoción"}</SubmitButton>
    </form>
  );
}

export function GenerateChargesForm({ currentPeriod }: { currentPeriod: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    generateCharges,
    undefined
  );

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Mes a generar</span>
        <input
          type="month"
          name="period"
          defaultValue={currentPeriod}
          className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        />
      </label>
      {state?.ok && (
        <p className="text-sm text-pitch">Cuotas generadas. Revisa la lista abajo.</p>
      )}
      <ErrorMsg state={state} />
      <SubmitButton>Generar cuotas del mes</SubmitButton>
    </form>
  );
}

export function CreateOneOffChargeForm({
  categories,
  students,
}: {
  categories: Option[];
  students: Option[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createOneOffCharge,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);
  const [target, setTarget] = useState("school");
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <SelectField
        label="Tipo"
        name="kind"
        options={[
          { value: "enrollment", label: "Inscripción" },
          { value: "event", label: "Evento / torneo" },
          { value: "product", label: "Producto" },
        ]}
        required
      />
      <TextField label="Concepto" name="name" placeholder="Ej. Inscripción 2026 / Uniforme" />
      <TextField label="Monto (MXN)" name="amount" type="number" placeholder="350.00" />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">¿A quién se le cobra?</span>
        <select
          name="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
        >
          <option value="school">Todos los alumnos activos</option>
          <option value="category">Una categoría</option>
          <option value="student">Un alumno</option>
        </select>
      </label>
      {target === "category" && (
        <SelectField
          label="Categoría"
          name="categoryId"
          options={categories}
          placeholder="Elige una categoría"
          required
        />
      )}
      {target === "student" && <StudentCombobox students={students} />}
      <ErrorMsg state={state} />
      <SubmitButton>Crear cobro</SubmitButton>
    </form>
  );
}

/** Quita acentos y pasa a minúsculas para comparar nombres. */
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Buscador de alumno con autocompletado (filtra en el cliente). Escala bien a
 * cientos de alumnos; guarda el id elegido en un input oculto `studentId`.
 */
function StudentCombobox({ students }: { students: Option[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Limpia cuando el formulario padre hace reset (tras crear el cobro).
  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setSelected(null);
      setQuery("");
      setOpen(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  // Cierra el desplegable al hacer clic fuera.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = normalize(query);
  const matches = (
    q ? students.filter((s) => normalize(s.label).includes(q)) : students
  ).slice(0, 8);

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1.5 block text-sm font-medium text-ink">Alumno</span>
      <input type="hidden" name="studentId" value={selected?.value ?? ""} />
      <input
        type="text"
        value={selected ? selected.label : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        placeholder={
          students.length ? "Escribe para buscar…" : "Registra alumnos primero"
        }
        className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      />
      {open && students.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-ink/15 bg-white py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">Sin coincidencias</li>
          ) : (
            matches.map((s) => (
              <li key={s.value}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-ink transition hover:bg-pitch/10"
                >
                  {s.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
