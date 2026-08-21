// src/lib/i18n.ts

export type Lang = "da" | "en";

// All UI string keys (compile-time exhaustiveness enforced by TypeScript)
export type TranslationKey =
  | "appTitle" | "appTagline"
  | "newAnalysis" | "dashboard" | "citationGraph" | "nodeGraph"
  | "overlaps" | "conflicts" | "browse" | "timeline"
  | "uploadTitle" | "uploadSubtitle"
  | "dropZoneSlot" | "dropZoneBulk"
  | "analyseButton" | "analysing"
  | "invalidPdfError" | "sizeLimitError" | "unknownError"
  | "multiDropNonPdfIgnored" | "multiDropCapReached"
  | "uploadModeBulk" | "uploadModeIndividual" | "addDocument" | "removeDocument"
  | "loadingGraph"
  | "allDocuments" | "allCategories"
  | "sectionCount" | "citationsCount" | "overlapsCount" | "conflictsCount"
  | "category" | "documentText" | "connections"
  | "obligation" | "exception" | "prohibition" | "permission"
  | "noTitle" | "noHeading"
  | "showInGraph" | "viewAnalysis" | "viewConflicts"
  | "docFallback"            // generic per-index fallback, used as "${docFallback} ${i+1}"
  | "aboutButton" | "backToApp"
  | "copyErrorDetails" | "copiedErrorDetails"
  | "presetLibraryTitle" | "presetLibrarySubtitle" | "analyzePresets"
  | "inspectConflict" | "conflictSummaryBanner"
  | "baseProvision" | "derogatingProvision"
  | "copyConflictBrief" | "copiedToClipboard" | "closeModal"
  | "selectedPresetCount"
  | "exportAuditMemo" | "fleetScenarios"
  | "conflictsHeaderTitle" | "conflictsHeaderSubtitle"
  | "euPrecedenceBadge" | "inspectionVerdictTitle"
  | "euRuleLabel" | "nationalDeviationLabel"
  | "showDocumentText" | "hideDocumentText" | "noConnections"
  | "outgoingCitation" | "incomingCitation"
  | "toggleFilters" | "showDetailsPanel" | "hideDetailsPanel"
  | "clearSelection" | "selectedProvision";

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
  documentText: "Dokumenttekst",
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
  showDocumentText: "Vis fuld lovtekst / dokumenttekst",
  hideDocumentText: "Skjul lovtekst",
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
};

const en: Translations = {
  appTitle: "LexGraph",
  appTagline: "Document Citation & Conflict Analysis",
  newAnalysis: "New Analysis",
  dashboard: "Dashboard",
  citationGraph: "Citation Graph",
  nodeGraph: "Node Graph (Physics)",
  overlaps: "Overlaps",
  conflicts: "Conflicts",
  browse: "Search & Browse",
  timeline: "Timeline & Deadlines",
  uploadTitle: "Start a new analysis",
  uploadSubtitle: "Upload your PDF documents and provide names to map citations and conflicts.",
  dropZoneSlot: "Drag and drop a PDF here, or click to select",
  dropZoneBulk: "Drag and drop your PDF documents here, or click to select multiple",
  analyseButton: "Analyse",
  analysing: "Analysing...",
  invalidPdfError: "Only PDF files are accepted.",
  sizeLimitError: "Combined file size exceeds 10 MB.",
  unknownError: "Unknown error. Please try again.",
  multiDropNonPdfIgnored: "Non-PDF files were ignored.",
  multiDropCapReached: "Only the first {max} PDF files were used; the rest were ignored.",
  uploadModeBulk: "Drop all at once",
  uploadModeIndividual: "Add one at a time",
  addDocument: "Add document",
  removeDocument: "Remove document",
  loadingGraph: "Analysing documents...",
  allDocuments: "All documents",
  allCategories: "All categories",
  sectionCount: "Sections",
  citationsCount: "Citations",
  overlapsCount: "Overlaps",
  conflictsCount: "Conflicts",
  category: "Category",
  documentText: "Document text",
  connections: "Graph connections",
  obligation: "Obligation",
  exception: "Exception",
  prohibition: "Prohibition",
  permission: "Permission",
  noTitle: "(No heading)",
  noHeading: "(No title)",
  showInGraph: "Show in graph",
  viewAnalysis: "View analysis",
  viewConflicts: "View conflicts",
  docFallback: "Document",
  aboutButton: "What is LexGraph?",
  backToApp: "Back to the app",
  copyErrorDetails: "Copy error details",
  copiedErrorDetails: "Copied!",
  presetLibraryTitle: "Select from Regulatory Library",
  presetLibrarySubtitle: "Choose 2 or more official fisheries control regulations for instant analysis:",
  analyzePresets: "Analyse Selected",
  inspectConflict: "Inspect Conflict",
  conflictSummaryBanner: "Legal Conflict Analysis",
  baseProvision: "Base Provision / Requirement",
  derogatingProvision: "Derogation / Conflicting Provision",
  copyConflictBrief: "Copy Brief",
  copiedToClipboard: "Copied to clipboard!",
  closeModal: "Close",
  selectedPresetCount: "{count} selected",
  exportAuditMemo: "Export Audit Memo",
  fleetScenarios: "Fleet Scenarios",
  conflictsHeaderTitle: "Regulatory Conflicts & Legal Risks",
  conflictsHeaderSubtitle: "Automated detection of contradictions between binding EU regulations and national orders. EU regulations take direct legal precedence over national law.",
  euPrecedenceBadge: "EU Regulation Takes Precedence",
  inspectionVerdictTitle: "Enforcement Assessment",
  euRuleLabel: "EU Base Rule (Requirement)",
  nationalDeviationLabel: "National Derogation (Exemption)",
  showDocumentText: "Show full legal text / document text",
  hideDocumentText: "Hide legal text",
  noConnections: "No direct graph connections found for this provision.",
  outgoingCitation: "References",
  incomingCitation: "Cited by",
  toggleFilters: "Filters & Search",
  showDetailsPanel: "Show connections & details",
  hideDetailsPanel: "Hide details",
  clearSelection: "Clear selection",
  selectedProvision: "Selected provision",
  connectedProvisions: "Connected provisions",
  jumpToProvision: "Focus provision",
};

export const translations: Record<Lang, Translations> = { da, en };

export type TranslateFn = (key: TranslationKey) => string;

/**
 * Returns a translation function for the given language.
 * Falls back to English for any key missing from the Danish dictionary.
 */
export function getT(lang: Lang): TranslateFn {
  return (key: TranslationKey) =>
    translations[lang][key] ?? translations["en"][key];
}
