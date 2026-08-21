import type { DocRef } from "./docDisplay";

export type Jurisdiction = "eu" | "national" | "unknown";

// National markers are checked first: a Danish order's label often names the EU act it
// transposes ("BEK om gennemførelse af forordning ..."), so an EU-first test would
// misclassify it. Word boundaries keep "lov" from matching inside "lovgivning".
// Danish act names are compounds ("Kontrolforordningen", "Logbogbekendtgoerelsen",
// "Fiskeriloven"), so the Danish stems are matched as suffixes with only a trailing boundary.
// A leading \b made every idiomatic Danish label classify as "unknown", which the audit memo
// and the connection explainer then read as a positive claim about the legal hierarchy.
// "order" is included because it is the standard English rendering of "bekendtgoerelse" and
// no EU instrument is called an order, so a Danish order labelled in English is not read as
// EU law. "act" is deliberately NOT included: "EU Delegated Act" is a real EU label.
const NATIONAL_RE = /(?:\b(?:bek|lbk)\b|bekendtg(?:ø|oe)relse(?:n|r|rne)?\b|lov(?:en|e)?\b|\border\b)/i;
const EU_RE = /(?:\b(?:eu|ef|e(?:ø|oe)s|regulation|directive|celex)\b|forordning(?:en|er|erne)?\b|direktiv(?:et|er)?\b)/i;

/**
 * Classifies a document as EU or national law from its user-supplied label.
 *
 * This must never key on the docId ("doc0", "doc1", ...), because those are assigned by
 * upload order, deriving legal precedence from them silently inverts the verdict when the
 * same corpus is uploaded in a different order.
 */
export function classifyDocLabel(label: string): Jurisdiction {
  if (!label) return "unknown";
  if (NATIONAL_RE.test(label)) return "national";
  if (EU_RE.test(label)) return "eu";
  return "unknown";
}

export function docJurisdiction(docs: DocRef[], docId: string): Jurisdiction {
  const doc = docs.find(d => d.id === docId);
  return classifyDocLabel(doc?.label ?? "");
}

/**
 * Classifies the document a node belongs to, falling back to the node's own label, section
 * labels are prefixed with the document code (e.g. "EU 2023/2842 Art. 14"), which still
 * carries the signal when the docs array is unavailable.
 */
export function nodeJurisdiction(
  docs: DocRef[],
  node: { doc: string; label: string }
): Jurisdiction {
  const fromDoc = docJurisdiction(docs, node.doc);
  if (fromDoc !== "unknown") return fromDoc;
  return classifyDocLabel(node.label);
}
