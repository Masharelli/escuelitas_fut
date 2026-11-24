import Link from "next/link";

/** Encabezado de página del portal: título, subtítulo opcional y acción a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && eyebrow !== title && (
          <p className="text-sm font-medium text-pitch">{eyebrow}</p>
        )}
        <h1 className="mt-0.5 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="min-w-0 max-w-full sm:max-w-[50%]">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-3xl border border-outline-variant bg-surface ${padded ? "p-4 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-outline-variant bg-surface-container px-5 py-8 text-center sm:p-10">
      {icon && (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          {icon}
        </div>
      )}
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Botón-enlace primario (verde pasto). */
export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="md-button md-filled"
    >
      {children}
    </Link>
  );
}

/** Botón-enlace secundario (contorno). */
export function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="md-button md-outlined"
    >
      {children}
    </Link>
  );
}
