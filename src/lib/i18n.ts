// src/lib/i18n.ts

export type Lang = "da" | "en";

// All UI string keys (compile-time exhaustiveness enforced by TypeScript)
export type TranslationKey =
  | "appTitle" | "appTagline"
  | "newAnalysis" | "dashboard" | "citationGraph" | "nodeGraph"
  | "overlaps" | "conflicts" | "browse"
  | "uploadTitle" | "uploadSubtitle"
  | "dropZoneA" | "dropZoneB"
  | "labelA" | "labelB"
  | "analyseButton" | "analysing"
  | "invalidPdfError" | "sizeLimitError" | "unknownError"
  | "loadingGraph"
  | "allDocuments" | "allCategories"
  | "sectionCount" | "citationsCount" | "overlapsCount" | "conflictsCount"
  | "category" | "documentText" | "connections"
  | "obligation" | "exception" | "prohibition" | "permission"
  | "noTitle" | "noHeading"
  | "showInGraph" | "viewAnalysis" | "viewConflicts"
  | "docA" | "docB"          // dynamic fallbacks when labelA/labelB are blank
  | "aboutButton" | "backToApp"
  | "copyErrorDetails" | "copiedErrorDetails";

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
  uploadSubtitle: "Upload to PDF-dokumenter og angiv navne for at kortlægge citationer og konflikter.",
  dropZoneA: "Træk og slip Dokument A her, eller klik for at vælge",
  dropZoneB: "Træk og slip Dokument B her, eller klik for at vælge",
  labelA: "Navn på Dokument A",
  labelB: "Navn på Dokument B",
  analyseButton: "Analysér",
  analysing: "Analyserer...",
  invalidPdfError: "Kun PDF-filer accepteres.",
  sizeLimitError: "Samlet filstørrelse overstiger 10 MB.",
  unknownError: "Ukendt fejl. Prøv igen.",
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
  docA: "Dokument A",
  docB: "Dokument B",
  aboutButton: "Hvad er LexGraph?",
  backToApp: "Tilbage til appen",
  copyErrorDetails: "Kopiér fejldetaljer",
  copiedErrorDetails: "Kopieret!",
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
  uploadTitle: "Start a new analysis",
  uploadSubtitle: "Upload two PDF documents and provide names to map citations and conflicts.",
  dropZoneA: "Drag and drop Document A here, or click to select",
  dropZoneB: "Drag and drop Document B here, or click to select",
  labelA: "Document A name",
  labelB: "Document B name",
  analyseButton: "Analyse",
  analysing: "Analysing...",
  invalidPdfError: "Only PDF files are accepted.",
  sizeLimitError: "Combined file size exceeds 10 MB.",
  unknownError: "Unknown error. Please try again.",
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
  docA: "Document A",
  docB: "Document B",
  aboutButton: "What is LexGraph?",
  backToApp: "Back to the app",
  copyErrorDetails: "Copy error details",
  copiedErrorDetails: "Copied!",
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
