import { PageHeader, EmptyState } from "@/components/ui";

export function ComingSoon({
  eyebrow,
  title,
  phase,
}: {
  eyebrow: string;
  title: string;
  phase: string;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 7v5l3 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        title="Próximamente"
        description={`Esta sección llegará en la ${phase}.`}
      />
    </div>
  );
}
