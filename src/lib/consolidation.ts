import { GraphData, GraphNode, GraphLink } from "./types";

/**
 * Consolidation tracing: for one provision, every provision in the corpus that bears on it.
 *
 * This is the question the citation graph can actually answer. The corpus contains three
 * acts that amend or implement EU 1224/2009, and a caseworker maintaining the working
 * consolidated text needs to know which of its articles each of them touches. The graph
 * already carries those edges; this module groups them by target and ranks them.
 *
 * The ranking key is the number of distinct *documents* citing a provision, not the raw
 * citation count. Raw counts rank drafting boilerplate: in the bundled corpus the four most
 * cited targets are the comitology procedure article and two bemyndigelse paragraphs, each
 * cited many times from inside its own act and never from outside it. Distinct source
 * documents is the measure of whether a provision is load-bearing across the corpus.
 */

export interface IncomingCitation {
  source: GraphNode;
  modality: GraphLink["modality"];
  /** The citing text changes this provision rather than merely referring to it. */
  amends: boolean;
  snippet: string;
  context: string;
}

export interface ProvisionRollup {
  target: GraphNode;
  incoming: IncomingCitation[];
  /** Number of distinct documents the citations come from. The ranking key. */
  actCount: number;
  /** Citations whose citing text amends this provision. */
  amendCount: number;
  /** Citations arriving from a document other than the target's own. */
  crossDocCount: number;
}

function endpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

/**
 * Builds the rollup for every provision that receives at least one citation.
 *
 * Unresolved external placeholders are excluded on both sides: as a target they are a
 * citation pointing outside the loaded corpus rather than a provision anyone can read, and
 * as a source they carry no text to quote.
 */
export function buildConsolidation(data: GraphData): ProvisionRollup[] {
  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const isReal = (n: GraphNode | undefined): n is GraphNode =>
    !!n && !n.external && !n.id.startsWith("external_");

  const byTarget = new Map<string, IncomingCitation[]>();
  for (const link of data.links) {
    const target = nodeById.get(endpointId(link.target));
    const source = nodeById.get(endpointId(link.source));
    if (!isReal(target) || !isReal(source)) continue;
    // A provision citing itself is a drafting artefact of the heading splitter, not a
    // relation between two provisions, and it would inflate its own rollup.
    if (source.id === target.id) continue;

    const list = byTarget.get(target.id) ?? [];
    list.push({
      source,
      modality: link.modality,
      amends: !!link.amends,
      snippet: link.snippet,
      context: link.context,
    });
    byTarget.set(target.id, list);
  }

  const rollups: ProvisionRollup[] = [];
  for (const [targetId, incoming] of byTarget) {
    const target = nodeById.get(targetId)!;
    rollups.push({
      target,
      // Amendments first, then the widest-reaching references, so the ledger reads top-down.
      incoming: [...incoming].sort((a, b) => {
        if (a.amends !== b.amends) return a.amends ? -1 : 1;
        return a.source.label.localeCompare(b.source.label, "da");
      }),
      actCount: new Set(incoming.map(c => c.source.doc)).size,
      amendCount: incoming.filter(c => c.amends).length,
      crossDocCount: incoming.filter(c => c.source.doc !== target.doc).length,
    });
  }

  return rollups.sort((a, b) => {
    if (a.actCount !== b.actCount) return b.actCount - a.actCount;
    if (a.amendCount !== b.amendCount) return b.amendCount - a.amendCount;
    if (a.incoming.length !== b.incoming.length) return b.incoming.length - a.incoming.length;
    return a.target.label.localeCompare(b.target.label, "da");
  });
}

/**
 * The rollup for one provision, or undefined when nothing in the corpus cites it.
 *
 * Callers that need a single provision should use this rather than filtering the full list:
 * an uncited provision has no rollup at all, and silently rendering an empty one would read
 * as "nothing bears on this article" when the honest answer is "no citation to it was found".
 */
export function getProvisionRollup(
  data: GraphData,
  targetId: string
): ProvisionRollup | undefined {
  return buildConsolidation(data).find(r => r.target.id === targetId);
}

export interface AmendmentEntry {
  /**
   * The citing provision. Its *document* is reliable; its article number often is not.
   *
   * An amending act quotes the replacement text it introduces, headings included
   * ("»Artikel 9a  Fiskeriovervågningscentre ...«"), and the heading splitter cannot tell a
   * quoted heading from a real one. EU 2023/2842 has six articles and parses as sixty-one
   * for exactly this reason, so a ledger entry's source article may name a provision of the
   * act being amended rather than of the act doing the amending.
   *
   * Callers must therefore attribute an amendment to `sourceDoc`, not to `source.label`.
   * The target is unaffected: it is resolved from the citation's own document cue.
   */
  source: GraphNode;
  /** The amending act. This is the attribution that holds. */
  sourceDoc: string;
  target: GraphNode;
  snippet: string;
  context: string;
}

/**
 * The amendment ledger: every citation whose text changes a provision in another document.
 *
 * Scoped to cross-document edges on purpose. An amending act restates its own instruction
 * text ("1) Artikel 4 ændres således: a) ..."), and those self-references make up the bulk
 * of the amendment-shaped citations in the corpus while telling a reader nothing about which
 * act changed which. What a consolidation ledger has to answer is which *other* act is being
 * changed, so a same-document amendment verb is not an entry.
 */
export function buildAmendmentLedger(data: GraphData): AmendmentEntry[] {
  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const entries: AmendmentEntry[] = [];

  for (const link of data.links) {
    if (!link.amends) continue;
    const source = nodeById.get(endpointId(link.source));
    const target = nodeById.get(endpointId(link.target));
    if (!source || !target) continue;
    if (target.external || target.id.startsWith("external_")) continue;
    if (source.doc === target.doc) continue;

    entries.push({
      source,
      sourceDoc: source.doc,
      target,
      snippet: link.snippet,
      context: link.context,
    });
  }

  return entries.sort((a, b) => {
    const byDoc = a.source.doc.localeCompare(b.source.doc);
    if (byDoc !== 0) return byDoc;
    if (a.target.number !== b.target.number) return a.target.number - b.target.number;
    return a.source.label.localeCompare(b.source.label, "da");
  });
}
