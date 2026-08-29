import { NextResponse } from "next/server";
import { PRESET_DOCUMENTS } from "@/lib/presetCorpus";
import { buildGraphFromInputs, readPresetInput, type ParseInput } from "@/lib/presetGraph";
import { buildConsolidation, buildAmendmentLedger } from "@/lib/consolidation";
import { toQueryString, DEFAULT_URL_STATE } from "@/lib/urlState";
import type { GraphData } from "@/lib/types";

/**
 * Read-only consolidation tracing over a preset corpus.
 *
 * This is the surface that makes the app navigable by something that cannot see pixels. The
 * two graph canvases render to SVG and carry no readable structure, and deliberately so: the
 * question this corpus answers well is "which provisions bear on this article, and which of
 * them change it", and that answer is a table, not a picture. Rather than describing the
 * drawings, this route serves the underlying answer directly.
 *
 * Every response carries the `url` that shows the same thing in the UI, so a caller can hand
 * a person the screen it just read.
 *
 *   GET /api/consolidation?docs=eu-1224-2009,eu-2023-2842
 *   GET /api/consolidation?docs=...&p=doc0_sec_14
 *   GET /api/consolidation?docs=...&view=amendments
 *
 * Only the bundled preset corpus is addressable. A hand-uploaded PDF has nowhere to persist
 * to, so there is no id that could name it, and answering for a different corpus than the
 * caller meant would be worse than not answering.
 */

// Bounds the default listing. The full corpus produces several hundred rollups, and a caller
// asking the broad question wants the load-bearing provisions, not a dump.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

// Matches the upload route's cap on documents per analysis.
const MAX_DOCS = 12;

function appUrl(docs: string[], extra: { provision?: string | null; view?: "consolidation" } = {}) {
  return toQueryString({
    ...DEFAULT_URL_STATE,
    docs,
    view: extra.view ?? "consolidation",
    provision: extra.provision ?? null,
  });
}

function serialiseNode(data: GraphData, id: string) {
  const node = data.nodes.find(n => n.id === id)!;
  return {
    id: node.id,
    label: node.label,
    title: node.title,
    doc: data.docs.find(d => d.id === node.doc)?.label ?? node.doc,
    theme: node.theme,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const docIds = (params.get("docs") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (docIds.length < 2) {
    return NextResponse.json(
      {
        error: "Angiv mindst 2 dokumenter i 'docs'.",
        availableDocs: PRESET_DOCUMENTS.map(d => ({ id: d.id, code: d.code, title: d.titleDa })),
      },
      { status: 400 }
    );
  }
  if (docIds.length > MAX_DOCS) {
    return NextResponse.json(
      { error: `Højst ${MAX_DOCS} dokumenter kan analyseres ad gangen.` },
      { status: 400 }
    );
  }

  const inputs: ParseInput[] = [];
  for (const id of docIds) {
    let input: ParseInput | null;
    try {
      input = await readPresetInput(id);
    } catch (e) {
      console.error(`Preset document ${id} could not be read:`, e);
      return NextResponse.json(
        { error: `Dokumentet '${id}' kunne ikke indlæses.` },
        { status: 500 }
      );
    }
    if (!input) {
      return NextResponse.json(
        {
          error: `Ukendt dokument-id: '${id}'.`,
          availableDocs: PRESET_DOCUMENTS.map(d => ({ id: d.id, code: d.code })),
        },
        { status: 400 }
      );
    }
    inputs.push(input);
  }

  const result = await buildGraphFromInputs(inputs);
  if (!result.ok) {
    console.error("Consolidation build failed:", result.failure);
    return NextResponse.json(
      { error: "Korpusset kunne ikke analyseres.", kind: result.failure.kind },
      { status: 422 }
    );
  }
  const data = result.data as GraphData;

  const corpus = {
    docs: docIds.map((id, i) => ({
      id,
      code: data.docs[i]?.label ?? id,
      nodeKey: data.docs[i]?.id ?? `doc${i}`,
    })),
    provisions: data.nodes.filter(n => !n.is_subnode).length,
    citations: data.links.length,
  };

  if (params.get("view") === "amendments") {
    const ledger = buildAmendmentLedger(data);
    return NextResponse.json({
      corpus,
      url: appUrl(docIds),
      question: "Hvilke bestemmelser ændrer en anden retsakt i dette korpus?",
      // Stated in the payload rather than left for the caller to discover: an amending act
      // quotes the replacement text it introduces, headings included, and the heading
      // splitter reads those quoted headings as sections of the amending act. Attribute an
      // amendment to `amendingAct`, never to `source.label`.
      caveat:
        "Ændringen tilskrives den ændrende retsakt (amendingAct), ikke artiklen i den. En ændringsforordning citerer den erstattende tekst med overskrifter, som overskriftsgenkendelsen ikke kan skelne fra rigtige overskrifter. Målbestemmelsen (target) er pålidelig.",
      amendmentCount: ledger.length,
      amendments: ledger.map(entry => ({
        amendingAct: data.docs.find(d => d.id === entry.sourceDoc)?.label ?? entry.sourceDoc,
        source: serialiseNode(data, entry.source.id),
        target: serialiseNode(data, entry.target.id),
        snippet: entry.snippet,
        context: entry.context,
        url: appUrl(docIds, { provision: entry.target.id }),
      })),
    });
  }

  const rollups = buildConsolidation(data);

  const provisionId = params.get("p");
  if (provisionId) {
    const rollup = rollups.find(r => r.target.id === provisionId);
    if (!rollup) {
      const known = data.nodes.some(n => n.id === provisionId);
      return NextResponse.json(
        {
          corpus,
          error: known
            ? `Ingen henvisninger til '${provisionId}' fundet i dette korpus.`
            : `Bestemmelsen '${provisionId}' findes ikke i dette korpus.`,
          // A caller that guessed an id needs somewhere to go next, not just a rejection.
          topProvisions: rollups.slice(0, 10).map(r => ({ id: r.target.id, label: r.target.label })),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      corpus,
      url: appUrl(docIds, { provision: rollup.target.id }),
      question: `Hvilke bestemmelser henviser til ${rollup.target.label}?`,
      provision: {
        ...serialiseNode(data, rollup.target.id),
        body: rollup.target.body,
      },
      actCount: rollup.actCount,
      amendCount: rollup.amendCount,
      crossDocCount: rollup.crossDocCount,
      citedBy: rollup.incoming.map(c => ({
        source: serialiseNode(data, c.source.id),
        modality: c.modality,
        amends: c.amends,
        snippet: c.snippet,
        context: c.context,
      })),
    });
  }

  const rawLimit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return NextResponse.json({
    corpus,
    url: appUrl(docIds),
    question: "Hvilke bestemmelser bærer flest henvisninger på tværs af retsakter?",
    // Stated rather than implied: the ranking is by distinct citing acts, because raw
    // citation counts rank drafting boilerplate above load-bearing provisions.
    ranking: "Sorteret efter antal forskellige retsakter der henviser til bestemmelsen.",
    totalProvisionsCited: rollups.length,
    provisions: rollups.slice(0, limit).map(r => ({
      ...serialiseNode(data, r.target.id),
      actCount: r.actCount,
      citationCount: r.incoming.length,
      amendCount: r.amendCount,
      crossDocCount: r.crossDocCount,
      url: appUrl(docIds, { provision: r.target.id }),
    })),
  });
}
