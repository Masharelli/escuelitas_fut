/**
 * Vocabulario por tipo de organización (Fase L1). El mismo producto sirve
 * academias (escuelitas) y ligas; este helper centraliza cómo nombramos las
 * cosas en la UI según el `kind`, para no tener "escuela" hardcodeado por todos
 * lados cuando el tenant es una liga.
 */

export type OrgKind = "academy" | "league";

export type OrgVocab = {
  kind: OrgKind;
  /** "escuela" / "liga" */
  noun: string;
  /** "Escuela" / "Liga" (capitalizado) */
  Noun: string;
  /** Etiqueta del portal de administración. */
  portalLabel: string;
  /** Etiqueta de la sección de ajustes ("Mi escuela" / "Mi liga"). */
  settingsLabel: string;
  /** Título y subtítulo del onboarding. */
  createTitle: string;
};

const ACADEMY: OrgVocab = {
  kind: "academy",
  noun: "escuela",
  Noun: "Escuela",
  portalLabel: "Administración",
  settingsLabel: "Mi escuela",
  createTitle: "Crea tu escuela",
};

const LEAGUE: OrgVocab = {
  kind: "league",
  noun: "liga",
  Noun: "Liga",
  portalLabel: "Administración",
  settingsLabel: "Mi liga",
  createTitle: "Crea tu liga",
};

export function orgVocab(kind: OrgKind | string | null | undefined): OrgVocab {
  return kind === "league" ? LEAGUE : ACADEMY;
}

export function isOrgKind(value: unknown): value is OrgKind {
  return value === "academy" || value === "league";
}
