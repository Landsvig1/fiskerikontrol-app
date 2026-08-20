// Single source of truth for modality → color, shared between every graph view (D3 node
// graph, citation graph canvas, legends, badges) so they can't drift out of sync.
export type Modality = "Obligation" | "Exception" | "Prohibition" | "Permission";

export const MODALITY_COLORS: Record<Modality, string> = {
  Obligation: "#0284c7",  // Nordic sky / slate blue
  Exception: "#d97706",   // Warm ochre / amber
  Prohibition: "#e11d48", // Danish brick / crimson
  Permission: "#059669",  // Scandinavian pine / sage
};

export const MODALITY_LEGEND: { modality: Modality; color: string; dashed: boolean }[] =
  (Object.keys(MODALITY_COLORS) as Modality[]).map(modality => ({
    modality,
    color: MODALITY_COLORS[modality],
    dashed: modality === "Exception",
  }));

const MODALITY_BADGE_CLASSES: Record<Modality, string> = {
  Exception: "bg-amber-50 text-amber-800 border border-amber-200/80",
  Prohibition: "bg-rose-50 text-rose-800 border border-rose-200/80",
  Permission: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
  Obligation: "bg-sky-50 text-sky-800 border border-sky-200/80",
};

// The graph data comes from an untyped API JSON response cast to GraphData with no runtime
// validation, so `modality` isn't actually guaranteed to be one of the 4 known literals at
// runtime. Fall back to Obligation's styling (matching the old if/else chain's default
// branch) instead of rendering an undefined color/class for an unrecognized value.
export function modalityColor(modality: Modality): string {
  return MODALITY_COLORS[modality] ?? MODALITY_COLORS.Obligation;
}

export function modalityBadgeClasses(modality: Modality): string {
  return MODALITY_BADGE_CLASSES[modality] ?? MODALITY_BADGE_CLASSES.Obligation;
}

// Ordered fallback palette for an arbitrary number of documents.
// Refined, muted Scandinavian architectural palette.
export const DOC_COLOR_PALETTE: string[] = [
  "#0284c7", // Nordic sky blue
  "#059669", // Pine green
  "#d97706", // Warm amber
  "#7c3aed", // Heather purple
  "#e11d48", // Brick red
  "#0891b2", // Teal
  "#475569", // Slate
  "#d946ef", // Plum
  "#ea580c", // Terracotta
  "#65a30d", // Moss
];

export function docColor(docIndex: number): string {
  return DOC_COLOR_PALETTE[docIndex % DOC_COLOR_PALETTE.length];
}
