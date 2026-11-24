import { TextField } from "@/components/text-field";

export { TextField };

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
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
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
        className="md-field"
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
        className="md-field resize-y"
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
        className="block w-full rounded-lg text-sm text-ink-soft outline-offset-2 focus-visible:outline-2 focus-visible:outline-pitch file:mr-3 file:min-h-12 file:rounded-full file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-sm file:font-semibold file:text-on-primary-container hover:file:bg-chalk-deep"
      />
    </FieldShell>
  );
}
