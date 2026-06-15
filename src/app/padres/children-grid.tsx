import Link from "next/link";
import Image from "next/image";

type Child = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  category?: { name: string } | null;
  team?: { name: string } | null;
  tenant?: { name: string } | null;
};

export function ChildrenGrid({ children }: { children: Child[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children.map((c) => (
        <Link
          key={c.id}
          href={`/padres/hijos/${c.id}`}
          className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-sm transition hover:border-pitch/30 hover:shadow"
        >
          <Avatar name={c.firstName} photoUrl={c.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">
              {c.firstName} {c.lastName}
            </p>
            {c.tenant && (
              <p className="truncate text-xs text-ink-soft">{c.tenant.name}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {c.category && <Badge>{c.category.name}</Badge>}
              {c.team && <Badge>{c.team.name}</Badge>}
            </div>
          </div>
          <svg
            className="shrink-0 text-ink-soft"
            width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={52}
        height={52}
        unoptimized
        className="h-[52px] w-[52px] shrink-0 rounded-full border border-ink/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-pitch/10 text-lg font-semibold text-pitch">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chalk-deep px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}
