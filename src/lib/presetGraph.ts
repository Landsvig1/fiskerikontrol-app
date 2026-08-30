import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeCitationsAndBuildGraph, type DocType, type ParseResult } from "./parser";
import { PRESET_DOCUMENTS } from "./presetCorpus";
import DOMMatrixPolyfill from "dommatrix";

/**
 * Server-side corpus loading and graph construction, shared by every route that needs a
 * parsed corpus.
 *
 * It lives outside the route handlers because there is now more than one way in: the upload
 * POST that the browser uses, and the read-only GET that makes a corpus addressable by
 * document ids alone. Two routes producing two subtly different graphs from the same bytes
 * would be a silent correctness failure, so the extraction and the analysis happen in one
 * place and the routes only differ in how they shape errors for their own caller.
 */

// pdfjs-dist (bundled in pdf-parse) constructs a DOMMatrix at module load time for its
// canvas module. Node has no DOMMatrix global, so importing pdf-parse crashes for any PDF
// that pulls in that code path unless we polyfill it first.
if (!("DOMMatrix" in globalThis)) {
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrixPolyfill }).DOMMatrix = DOMMatrixPolyfill;
}

// A 10 MB PDF can decompress to far more text than 10 MB. The parser runs several global
// regex sweeps over the full extracted string, so the decompressed size is the real input
// to the expensive work and needs its own bound.
export const MAX_CHARS_PER_DOC = 4_000_000;

// Documents per analysis. Shared so the upload route and the read-only consolidation route
// cannot drift into accepting different corpus sizes for the same underlying parse.
export const MAX_DOCS = 12;

/**
 * Parsed corpora, keyed on the preset ids in the order they were requested.
 *
 * The bundled PDFs are immutable for the life of a deployment, so a given id sequence always
 * yields the same graph. Re-parsing it per request is pure repeated work, and at roughly
 * eight seconds for two documents it decides whether a shared link opens or looks broken.
 * There is nothing to invalidate: a new corpus means a new deployment.
 *
 * Keyed on the requested ORDER, never a sorted key. Node ids ("doc0_sec_14") are positional,
 * so the same ids in a different order are a genuinely different graph and must not collide.
 *
 * Only successful builds are stored, so a transient read failure cannot poison an entry.
 *
 * The entries live as long as the process does. That is the intended shape for a long-lived
 * server; on a platform that recycles instances per request the cache is still correct, just
 * less effective, because a cold instance starts empty.
 */
const MAX_CACHED_CORPORA = 8;
const graphCache = new Map<string, ParseResult>();

/**
 * Collapses repeated ids, preserving first-seen order.
 *
 * The same id twice would be loaded as two documents carrying identical text, so every
 * self-reference inside that act would be reported as a citation between two separate acts.
 * Both preset entry points run this before validating or building a cache key, so they
 * cannot disagree about what corpus a request names.
 */
export function dedupePresetIds(presetIds: readonly string[]): string[] {
  return Array.from(new Set(presetIds));
}

export function presetCacheKey(presetIds: readonly string[]): string {
  return presetIds.join(",");
}

export function getCachedPresetGraph(key: string): ParseResult | undefined {
  const hit = graphCache.get(key);
  // Re-insert so Map's insertion order tracks recency of use, not of first build.
  if (hit) {
    graphCache.delete(key);
    graphCache.set(key, hit);
  }
  return hit;
}

export function cachePresetGraph(key: string, data: ParseResult): void {
  graphCache.delete(key);
  graphCache.set(key, data);
  while (graphCache.size > MAX_CACHED_CORPORA) {
    const oldest = graphCache.keys().next().value;
    if (oldest === undefined) break;
    graphCache.delete(oldest);
  }
}

/** Test seam: the cache is process-wide and would otherwise leak across test files. */
export function clearPresetGraphCache(): void {
  graphCache.clear();
}

export interface ParseInput {
  buffer: Buffer;
  label: string;
  type?: DocType;
}

/** Everything that can go wrong between a set of inputs and a finished graph. */
export type GraphBuildFailure =
  | { kind: "pdf_read"; cause: unknown }
  | { kind: "too_much_text"; index: number }
  | { kind: "insufficient_structure"; code: string; message: string; patternCounts?: Record<string, number>; docKey?: string }
  | { kind: "too_few_documents"; code: string; message: string }
  | { kind: "unexpected"; cause: unknown };

export type GraphBuildResult =
  | { ok: true; data: ParseResult }
  | { ok: false; failure: GraphBuildFailure };

/**
 * Reads one bundled preset document off disk.
 *
 * The corpus lives under public/, which is served statically but is not part of the function
 * bundle by default; next.config.ts traces it in explicitly.
 */
export async function readPresetInput(presetId: string): Promise<ParseInput | null> {
  const doc = PRESET_DOCUMENTS.find(d => d.id === presetId);
  if (!doc) return null;
  const buffer = await readFile(path.join(process.cwd(), "public", "corpus", doc.filename));
  return { buffer, label: doc.code, type: doc.type };
}

/** Text extraction plus graph construction. Never throws; failures come back as data. */
export async function buildGraphFromInputs(inputs: ParseInput[]): Promise<GraphBuildResult> {
  const { PDFParse } = await import("pdf-parse");
  const parsers = inputs.map(input => new PDFParse({ data: input.buffer }));
  let extracted;
  try {
    extracted = await Promise.all(parsers.map(p => p.getText()));
  } catch (cause: unknown) {
    return { ok: false, failure: { kind: "pdf_read", cause } };
  } finally {
    await Promise.all(parsers.map(p => p.destroy()));
  }

  const oversized = extracted.findIndex(e => e.text.length > MAX_CHARS_PER_DOC);
  if (oversized !== -1) {
    return { ok: false, failure: { kind: "too_much_text", index: oversized } };
  }

  try {
    const data = analyzeCitationsAndBuildGraph(
      inputs.map((input, i) => ({
        text: extracted[i].text,
        label: input.label,
        ...(input.type ? { type: input.type } : {}),
      }))
    );
    return { ok: true, data };
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e) {
      const err = e as {
        code: string;
        message: string;
        patternCounts?: Record<string, number>;
        docKey?: string;
      };
      if (err.code === "INSUFFICIENT_STRUCTURE") {
        return {
          ok: false,
          failure: {
            kind: "insufficient_structure",
            code: err.code,
            message: err.message,
            patternCounts: err.patternCounts,
            docKey: err.docKey,
          },
        };
      }
      return {
        ok: false,
        failure: { kind: "too_few_documents", code: err.code, message: err.message },
      };
    }
    return { ok: false, failure: { kind: "unexpected", cause: e } };
  }
}
