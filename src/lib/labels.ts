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

export const CANONICAL_PROCESS_ORDER: string[] = [
  "Licenser & Tilladelser",
  "VMS, Sporing & AIS",
  "Fangst & Logbog",
  "Forhåndsanmeldelse & Anløb",
  "Landing & Omladning",
  "Vejning & Landingsopgørelse",
  "Salgsnotater & Førsteomsætning",
  "Sporbarhed & Mærkning",
  "Kontrol, Tilsyn & REM",
  "Sanktioner & Pointsystem",
  "Datavalidering & Samarbejde",
  "Definitioner & Retsgrundlag",
  "Generelle Bestemmelser",
];

const THEME_TRANSLATIONS_DA: Record<string, string> = {
  // English -> Danish process mapping
  "Licensing & Authorizations": "Licenser & Tilladelser",
  "VMS, Tracking & AIS": "VMS, Sporing & AIS",
  "Catch & Logbook": "Fangst & Logbog",
  "Prior Notification & Port Call": "Forhåndsanmeldelse & Anløb",
  "Landing & Transhipment": "Landing & Omladning",
  "Weighing & Landing Declaration": "Vejning & Landingsopgørelse",
  "Sales Notes & First Sale": "Salgsnotater & Førsteomsætning",
  "Traceability & Labeling": "Sporbarhed & Mærkning",
  "Inspection, Surveillance & REM": "Kontrol, Tilsyn & REM",
  "Sanctions & Penalty Points": "Sanktioner & Pointsystem",
  "Data Validation & Cooperation": "Datavalidering & Samarbejde",
  "Definitions & Legal Framework": "Definitioner & Retsgrundlag",
  "General Provisions": "Generelle Bestemmelser",
  // Legacy / fallback mappings
  "Definitions and Scope": "Definitioner & Retsgrundlag",
  "Obligations and Duties": "Forpligtelser & Pligter",
  "Rights and Permissions": "Rettigheder & Tilladelser",
  "Exceptions and Exemptions": "Undtagelser & Dispensationer",
  "Enforcement and Sanctions": "Håndhævelse & Sanktioner",
  "Reporting and Documentation": "Indberetning & Dokumentation",
  "Procedures and Processes": "Procedurer & Processer",
  "Transitional and Final Provisions": "Overgangs- & Slutbestemmelser",
  "General": "Generelle Bestemmelser",
  "Control": "Kontrol",
  "Obligation": "Forpligtelse",
  "Exception": "Undtagelse",
  "Permission": "Tilladelse",
  "Prohibition": "Forbud",
};


/** Translates an internal theme / category name to Danish. */
export function themeLabel(theme: string): string {
  if (!theme) return "";
  return THEME_TRANSLATIONS_DA[theme] || theme;
}

/**
 * Formats a conflict description for display. The parser emits its generic collision
 * sentence in English, so that one case is rewritten into Danish; a description the parser
 * derived from the actual provisions is passed through as it stands.
 */
export function formatConflictDescription(
  rawDescription: string,
  targetLabel: string = ""
): string {
  if (!rawDescription || rawDescription.toLowerCase().includes("potential conflict: one section creates an exception")) {
    const subject = targetLabel ? `vedrørende ${targetLabel}` : "for denne regulering";
    return `Potentiel regulatorisk modstrid: Én bestemmelse fastsætter en undtagelse/lempelse, mens en anden bestemmelse pålægger en bindende forpligtelse eller et forbud ${subject}.`;
  }
  return rawDescription;
}
