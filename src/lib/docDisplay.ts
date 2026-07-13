import { docColor } from "@/lib/graphColors";
import type { TranslateFn } from "@/lib/i18n";
import type { DocRef } from "@/lib/parser";

export type { DocRef };

// Resolves a docId to its display label, falling back to "{docFallback} {index+1}" when
// the user left that document's label blank.
export function docLabel(docs: DocRef[], docId: string, t: TranslateFn): string {
  const idx = docs.findIndex(d => d.id === docId);
  if (idx < 0) return docId;
  return docs[idx].label || `${t("docFallback")} ${idx + 1}`;
}

export function docColorFor(docs: DocRef[], docId: string): string {
  const idx = docs.findIndex(d => d.id === docId);
  return docColor(idx < 0 ? 0 : idx);
}

// Shared inline-style object for doc-colored badges, so background/text/border alpha
// variants can't drift out of sync across the badges that render them (dashboard, overlaps,
// conflicts, browse, selected-node panels).
export function docBadgeStyle(
  docs: DocRef[],
  docId: string,
  opts: { bgAlpha?: string; borderAlpha?: string } = {}
): { backgroundColor: string; color: string; borderColor?: string } {
  const color = docColorFor(docs, docId);
  const { bgAlpha = "1a", borderAlpha } = opts;
  return {
    backgroundColor: `${color}${bgAlpha}`,
    color,
    ...(borderAlpha ? { borderColor: `${color}${borderAlpha}` } : {}),
  };
}
