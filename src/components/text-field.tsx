/** Campo de texto con etiqueta, pista opcional y estilo del sistema de diseño. */
export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition placeholder:text-ink-soft/50 focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      />
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}
