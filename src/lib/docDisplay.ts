import { docColor } from "@/lib/graphColors";
import type { TranslateFn } from "@/lib/i18n";

export interface DocRef {
  id: string;
  label: string;
}

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
