import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSchoolBySlug, type PublicSchool } from "@/lib/tenant-public";
import { getPublicSeasons } from "@/lib/league-public";
import { TenantTheme } from "@/components/brand/tenant-theme";
import { SchoolCrest } from "@/components/brand/school-crest";
import { PitchBackdrop } from "@/components/brand/pitch-backdrop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return { title: "Escuela no encontrada" };
  return {
    title: `${school.name} · Escuelitas Fut`,
    description:
      school.description ?? `Página de ${school.name} en Escuelitas Fut.`,
  };
}

export default async function SchoolPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  if (school.kind === "league") return <LeagueLanding school={school} />;

  const loginHref = `/login?e=${encodeURIComponent(school.slug)}`;
  const registroHref = `/registro?e=${encodeURIComponent(school.slug)}`;

  const contact = [
    school.city && { icon: <PinIcon />, text: school.city },
    school.phone && { icon: <PhoneIcon />, text: school.phone },
    school.email && { icon: <MailIcon />, text: school.email },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <TenantTheme primaryColor={school.primaryColor}>
      <main className="relative flex w-full min-w-0 flex-1 flex-col overflow-hidden bg-chalk text-ink">
        <PitchBackdrop />

        <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rise flex w-full flex-col items-center">
            <SchoolCrest name={school.name} logoUrl={school.logoUrl} size={96} />

            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight">
              {school.name}
            </h1>

            {school.description && (
              <p className="mt-3 max-w-xl text-pretty text-ink-soft">
                {school.description}
              </p>
            )}

            {contact.length > 0 && (
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {contact.map((c, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm text-ink-soft"
                  >
                    {c.icon}
                    {c.text}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-9 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={registroHref}
                className="inline-flex w-full items-center justify-center rounded-full bg-pitch px-6 py-3 font-semibold text-chalk shadow-sm transition hover:bg-pitch-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:w-auto"
              >
                Crear cuenta de tutor
              </Link>
              <Link
                href={loginHref}
                className="inline-flex w-full items-center justify-center rounded-full border border-ink/15 bg-white/80 px-6 py-3 font-semibold text-ink transition hover:border-pitch/30 hover:bg-pitch/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:w-auto"
              >
                Iniciar sesión
              </Link>
            </div>

            <p className="mt-8 text-xs text-ink-soft/80">
              Con tecnología de{" "}
              <Link href="/" className="font-semibold text-pitch hover:underline">
                Escuelitas Fut
              </Link>
            </p>
          </div>
        </section>
      </main>
    </TenantTheme>
  );
}

const SEASON_STATUS: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Próxima", cls: "bg-sky-100 text-sky-700" },
  active: { label: "En curso", cls: "bg-pitch/15 text-pitch" },
  finished: { label: "Terminada", cls: "bg-ink/10 text-ink-soft" },
};

async function LeagueLanding({ school }: { school: PublicSchool }) {
  const seasons = await getPublicSeasons(school.id);

  return (
    <TenantTheme primaryColor={school.primaryColor}>
      <main className="relative flex w-full min-w-0 flex-1 flex-col overflow-hidden bg-chalk text-ink">
        <PitchBackdrop />
        <section className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-6 py-14">
          <div className="rise flex flex-col items-center text-center">
            <SchoolCrest name={school.name} logoUrl={school.logoUrl} size={88} />
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {school.name}
            </h1>
            {school.description && (
              <p className="mt-3 max-w-xl text-pretty text-ink-soft">
                {school.description}
              </p>
            )}
          </div>

          <h2 className="mt-10 mb-3 font-display text-lg font-bold">Temporadas</h2>
          {seasons.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center text-sm text-ink-soft">
              Esta liga aún no tiene temporadas publicadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {seasons.map((s) => {
                const st = SEASON_STATUS[s.status] ?? SEASON_STATUS.active;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/e/${school.slug}/temporada/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 shadow-sm transition hover:border-pitch/30 hover:shadow"
                    >
                      <span className="truncate font-semibold text-ink">{s.name}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-10 text-center text-xs text-ink-soft/80">
            Con tecnología de{" "}
            <Link href="/" className="font-semibold text-pitch hover:underline">
              Escuelitas Fut
            </Link>
          </p>
        </section>
      </main>
    </TenantTheme>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
