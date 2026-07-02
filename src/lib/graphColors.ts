// Single source of truth for modality → color, shared between every graph view (D3 node
// graph, citation graph canvas, legends, badges) so they can't drift out of sync.
export type Modality = "Obligation" | "Exception" | "Prohibition" | "Permission";

export const MODALITY_COLORS: Record<Modality, string> = {
  Obligation: "#3b82f6",
  Exception: "#ef4444",
  Prohibition: "#ec4899",
  Permission: "#10b981",
};

export const MODALITY_LEGEND: { modality: Modality; color: string; dashed: boolean }[] =
  (Object.keys(MODALITY_COLORS) as Modality[]).map(modality => ({
    modality,
    color: MODALITY_COLORS[modality],
    dashed: modality === "Exception",
  }));

const MODALITY_BADGE_CLASSES: Record<Modality, string> = {
  Exception: "bg-[#ef4444]/10 text-[#f87171]",
  Prohibition: "bg-[#ec4899]/10 text-[#f472b6]",
  Permission: "bg-[#10b981]/10 text-[#34d399]",
  Obligation: "bg-[#3b82f6]/10 text-[#60a5fa]",
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
