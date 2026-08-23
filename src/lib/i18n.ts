// src/lib/i18n.ts


// All UI string keys (compile-time exhaustiveness enforced by TypeScript)
export type TranslationKey =
  | "appTitle" | "appTagline"
  | "newAnalysis" | "dashboard" | "citationGraph" | "nodeGraph"
  | "overlaps" | "conflicts" | "browse" | "timeline"
  | "uploadTitle" | "uploadSubtitle"
  | "dropZoneSlot" | "dropZoneBulk"
  | "analyseButton" | "analysing"
  | "invalidPdfError" | "sizeLimitError" | "unknownError" | "malformedResponseError"
  | "multiDropNonPdfIgnored" | "multiDropCapReached"
  | "uploadModeBulk" | "uploadModeIndividual" | "addDocument" | "removeDocument"
  | "loadingGraph"
  | "allDocuments" | "allCategories"
  | "sectionCount" | "citationsCount" | "overlapsCount" | "conflictsCount"
  | "category" | "connections"
  | "obligation" | "exception" | "prohibition" | "permission"
  | "noTitle" | "noHeading"
  | "showInGraph" | "viewAnalysis" | "viewConflicts"
  | "docFallback"            // generic per-index fallback, used as "${docFallback} ${i+1}"
  | "aboutButton" | "backToApp"
  | "copyErrorDetails" | "copiedErrorDetails"
  | "presetLibraryTitle" | "presetLibrarySubtitle" | "analyzePresets"
  | "inspectConflict" | "conflictSummaryBanner"
  | "provisionText" | "groupConflict" | "groupOutgoing" | "groupIncoming"
  | "euPrecedenceLabel" | "euPrecedenceBody"
  | "clarificationLabel" | "clarificationBody"
  | "baseProvision" | "derogatingProvision"
  | "copyConflictBrief" | "copiedToClipboard" | "closeModal"
  | "selectedPresetCount"
  | "exportAuditMemo" | "fleetScenarios"
  | "conflictsHeaderTitle" | "conflictsHeaderSubtitle"
  | "euPrecedenceBadge" | "inspectionVerdictTitle"
  | "euRuleLabel" | "nationalDeviationLabel"
  | "noConnections"
  | "outgoingCitation" | "incomingCitation"
  | "toggleFilters" | "showDetailsPanel" | "hideDetailsPanel"
  | "clearSelection" | "selectedProvision"
  | "connectedProvisions" | "jumpToProvision"
  | "explainConnectionTitle" | "citationContext" | "connectedTextSnippet"
  | "switchFocusToProvision" | "legalRelation" | "hierarchyRule"
  | "clickForExplanation" | "conflictWarning"
  | "viewErrorTitle" | "viewErrorBody" | "viewErrorDetails" | "viewErrorRetry";

export type Translations = Record<TranslationKey, string>;

const da: Translations = {
  appTitle: "LexGraph",
  appTagline: "Dokumentcitations- og konfliktanalyse",
  newAnalysis: "Ny analyse",
  dashboard: "Oversigt",
  citationGraph: "Citation Graf",
  nodeGraph: "Node Graf (Fysik)",
  overlaps: "Overlap",
  conflicts: "Konflikter",
  browse: "Søg & Slå Op",
  uploadTitle: "Start ny analyse",
  uploadSubtitle: "Upload dine PDF-dokumenter og angiv navne for at kortlægge citationer og konflikter.",
  dropZoneSlot: "Træk og slip en PDF her, eller klik for at vælge",
  dropZoneBulk: "Træk og slip dine PDF-dokumenter her, eller klik for at vælge flere",
  analyseButton: "Analysér",
  analysing: "Analyserer...",
  invalidPdfError: "Kun PDF-filer accepteres.",
  sizeLimitError: "Samlet filstørrelse overstiger 10 MB.",
  unknownError: "Ukendt fejl. Prøv igen.",
  malformedResponseError: "Serveren returnerede et uventet svar. Prøv igen.",
  multiDropNonPdfIgnored: "Ikke-PDF-filer blev ignoreret.",
  multiDropCapReached: "Kun de første {max} PDF-filer blev brugt; øvrige filer blev ignoreret.",
  uploadModeBulk: "Slip alle på én gang",
  uploadModeIndividual: "Tilføj ét ad gangen",
  addDocument: "Tilføj dokument",
  removeDocument: "Fjern dokument",
  loadingGraph: "Analyserer dokumenter...",
  allDocuments: "Alle dokumenter",
  allCategories: "Alle kategorier",
  sectionCount: "Sektioner",
  citationsCount: "Citationer",
  overlapsCount: "Overlap",
  conflictsCount: "Konflikter",
  category: "Kategori",
  connections: "Forbindelser i grafen",
  obligation: "Forpligtelse",
  exception: "Undtagelse",
  prohibition: "Forbud",
  permission: "Tilladelse",
  noTitle: "(Ingen overskrift)",
  noHeading: "(Uden titel)",
  showInGraph: "Vis i graf",
  viewAnalysis: "Vis analyse",
  viewConflicts: "Vis konflikter",
  docFallback: "Dokument",
  aboutButton: "Hvad er LexGraph?",
  backToApp: "Tilbage til appen",
  copyErrorDetails: "Kopiér fejldetaljer",
  copiedErrorDetails: "Kopieret!",
  presetLibraryTitle: "Vælg fra reguleringsarkivet",
  presetLibrarySubtitle: "Vælg 2 eller flere officielle fiskeriretsakter til øjeblikkelig analyse:",
  analyzePresets: "Analysér valgte",
  inspectConflict: "Inspicer modstrid",
  conflictSummaryBanner: "Juridisk modstridsanalyse",
  provisionText: "Bestemmelsens tekst",
  groupConflict: "Modstrid",
  groupOutgoing: "Udgående henvisninger",
  groupIncoming: "Indgående henvisninger",
  euPrecedenceLabel: "EU-retlig forrang:",
  euPrecedenceBody: "EU-forordninger har direkte retsvirkning og overtrumfer nationale bekendtgørelser. Nationale undtagelser kan ikke lovligt fravige bindende EU-krav.",
  clarificationLabel: "Retslig afklaring påkrævet:",
  clarificationBody: "Der foreligger modstridende modaliteter mellem bestemmelserne, men forholdet er ikke et EU/national forrangsspørgsmål ud fra dokumentbetegnelserne.",
  baseProvision: "Hovedbestemmelse / Krav",
  derogatingProvision: "Undtagelse / Modstridende bestemmelse",
  copyConflictBrief: "Kopiér notat",
  copiedToClipboard: "Kopieret til udklipsholder!",
  closeModal: "Luk",
  timeline: "Tidslinje & Frister",
  selectedPresetCount: "{count} valgt",
  exportAuditMemo: "Eksportér Tilsynsnotat",
  fleetScenarios: "Flådescenarier",
  conflictsHeaderTitle: "Regulatoriske Modstrid & Retsrisici",
  conflictsHeaderSubtitle: "Automatisk identifikation af modsigelser mellem bindende EU-forordninger og nationale bekendtgørelser. EU-forordninger har direkte retsvirkning og forrang frem for national ret.",
  euPrecedenceBadge: "EU-forordning har forrang",
  inspectionVerdictTitle: "Konklusion for Tilsynet",
  euRuleLabel: "EU Hovedregel (Krav)",
  nationalDeviationLabel: "National Undtagelse (Afvigelse)",
  noConnections: "Ingen direkte forbindelser fundet i grafen for denne bestemmelse.",
  outgoingCitation: "Refererer til",
  incomingCitation: "Citeret af",
  toggleFilters: "Filtre & Søgning",
  showDetailsPanel: "Vis forbindelser & detaljer",
  hideDetailsPanel: "Skjul detaljer",
  clearSelection: "Ryd valg",
  selectedProvision: "Valgt bestemmelse",
  connectedProvisions: "Forbundne bestemmelser",
  jumpToProvision: "Fokusér bestemmelse",
  explainConnectionTitle: "Juridisk sammenhæng & retsvirkning",
  citationContext: "Citatkontekst & passus",
  connectedTextSnippet: "Lovtekst for forbundet bestemmelse",
  switchFocusToProvision: "Skift graf-fokus til denne bestemmelse",
  legalRelation: "Retlig relation",
  hierarchyRule: "Hierarki & Retsorden",
  clickForExplanation: "Klik for forklaring af sammenhæng",
  conflictWarning: "Konstateret retskonflikt / overlap",
  viewErrorTitle: "Denne visning kunne ikke indlæses",
  viewErrorBody: "Der opstod en fejl under visning af de indlæste dokumenter. De øvrige faner virker fortsat, og analysen er ikke gået tabt.",
  viewErrorDetails: "Teknisk fejlbesked",
  viewErrorRetry: "Prøv visningen igen",
};


export const translations: Translations = da;

export type TranslateFn = (key: TranslationKey) => string;

/**
 * Returns the translation function. The app is Danish only: it is a tool for Danish
 * fisheries-control caseworkers reading Danish and EU law in Danish, and an unreviewed
 * English rendering of legal text is a liability rather than a feature.
 */
export function getT(): TranslateFn {
  return (key: TranslationKey) => translations[key];
}
