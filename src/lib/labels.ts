/** Derives a human-readable document label from an uploaded PDF filename. */
export function deriveLabelFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.pdf$/i, "");
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const THEME_TRANSLATIONS_DA: Record<string, string> = {
  "Definitions and Scope": "Definitioner & Anvendelsesområde",
  "Obligations and Duties": "Forpligtelser & Pligter",
  "Rights and Permissions": "Rettigheder & Tilladelser",
  "Exceptions and Exemptions": "Undtagelser & Dispensationer",
  "Enforcement and Sanctions": "Håndhævelse & Sanktioner",
  "Reporting and Documentation": "Indberetning & Dokumentation",
  "Procedures and Processes": "Procedurer & Processer",
  "Transitional and Final Provisions": "Overgangs- & Slutbestemmelser",
  "General": "Generelt",
  "Control": "Kontrol",
  "Obligation": "Forpligtelse",
  "Exception": "Undtagelse",
  "Permission": "Tilladelse",
  "Prohibition": "Forbud",
};

/** Translates an internal theme / category name to Danish when lang is "da". */
export function themeLabel(theme: string, lang: "da" | "en" = "da"): string {
  if (!theme) return "";
  if (lang === "en") return theme;
  return THEME_TRANSLATIONS_DA[theme] || theme;
}

/** Formats a conflict description into Danish when lang is "da". */
export function formatConflictDescription(
  rawDescription: string,
  targetLabel: string = "",
  lang: "da" | "en" = "da"
): string {
  if (lang === "da") {
    if (!rawDescription || rawDescription.toLowerCase().includes("potential conflict: one section creates an exception")) {
      const subject = targetLabel ? `vedrørende ${targetLabel}` : "for denne regulering";
      return `Potentiel regulatorisk modstrid: Én bestemmelse fastsætter en undtagelse/lempelse, mens en anden bestemmelse pålægger en bindende forpligtelse eller et forbud ${subject}.`;
    }
    return rawDescription;
  }
  return rawDescription || `Potential regulatory conflict regarding ${targetLabel || "this provision"}.`;
}
