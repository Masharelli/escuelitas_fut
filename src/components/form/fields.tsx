import { TextField } from "@/components/text-field";

export { TextField };

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition placeholder:text-ink-soft/50 focus:border-pitch focus:ring-2 focus:ring-pitch/20";

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  placeholder = "Selecciona…",
  hint,
  required = false,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className={inputClass}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} resize-y`}
      />
    </FieldShell>
  );
}

export function FileField({
  label,
  name,
  hint,
  accept = "image/png,image/jpeg,image/webp",
}: {
  label: string;
  name: string;
  hint?: string;
  accept?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="file"
        name={name}
        accept={accept}
        className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-pitch/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pitch hover:file:bg-pitch/15"
      />
    </FieldShell>
  );
}
