import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeCitationsAndBuildGraph, type DocType } from "@/lib/parser";
import { PRESET_DOCUMENTS } from "@/lib/presetCorpus";
import { translations as da } from "@/lib/i18n";
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";
import DOMMatrixPolyfill from "dommatrix";

// pdfjs-dist (bundled in pdf-parse) constructs a DOMMatrix at module load time
// for its canvas module. Node has no DOMMatrix global, so importing pdf-parse
// crashes for any PDF that pulls in that code path unless we polyfill it first.
if (!("DOMMatrix" in globalThis)) {
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrixPolyfill }).DOMMatrix = DOMMatrixPolyfill;
}

// User-facing strings are Danish and come from the same table as the rest of the UI, with
// the diagnostic detail kept in `details` for the copyable error report rather than in the
// message a caseworker reads.
function msg(key: keyof typeof da, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce<string>(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    da[key]
  );
}

/**
 * Error shape returned to the browser. The stack is withheld in production: UploadScreen
 * renders this report verbatim for the user to copy, and a stack trace carries absolute
 * filesystem paths from the build machine.
 */
function errorDetails(e: unknown) {
  const includeStack = process.env.NODE_ENV !== "production";
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: includeStack ? e.stack : undefined };
  }
  return { name: "UnknownError", message: String(e), stack: undefined };
}

export async function POST(request: Request) {
  try {
    return await handleParse(request);
  } catch (e: unknown) {
    console.error("Unhandled error in /api/parse:", e);
    const details = errorDetails(e);
    return NextResponse.json(
      { error: msg("apiErrUnexpected"), details },
      { status: 500 }
    );
  }
}

// Matches the client's MAX_SLOTS in UploadScreen.tsx. Enforced server-side too since the
// indexed pdf${i} loop below has no other bound, without this, a request crafted outside
// the UI could submit an unbounded number of small PDFs (each triggering its own pdf-parse
// invocation) while still fitting under the combined size cap.
const MAX_DOCS = 12;

// Labels are user-supplied text, not file bytes, so they are bounded separately.
const MAX_LABEL_CHARS = 200;

// A 10 MB PDF can decompress to far more text than 10 MB. The parser runs several global
// regex sweeps over the full extracted string, so the decompressed size is the real input
// to the expensive work and needs its own bound.
const MAX_CHARS_PER_DOC = 4_000_000;

// Only the bundled preset corpus sends type${i}. It is the authoritative EU/national
// classification and drives the supremacy verdict in the audit memo, so an unrecognised
// value is rejected rather than coerced, and an absent one falls back to label matching.
const DOC_TYPES: readonly DocType[] = ["eu", "bek", "lov"];

interface ParseInput {
  buffer: Buffer;
  label: string;
  type?: DocType;
}

async function handleParse(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  // Preset runs post a list of ids. The corpus PDFs already ship with the deployment, so
  // downloading them into the browser and posting the bytes back achieved nothing except a
  // multi-megabyte request that the platform's body limit rejected.
  if (contentType.includes("application/json")) {
    return handlePresetParse(request);
  }
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: msg("apiErrContentType") }, { status: 400 });
  }
  return handleUploadParse(request);
}

async function handlePresetParse(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: msg("apiErrBadJson") }, { status: 400 });
  }

  const presetIds = (body as { presetIds?: unknown })?.presetIds;
  if (!Array.isArray(presetIds) || presetIds.some(id => typeof id !== "string")) {
    return NextResponse.json({ error: msg("apiErrPresetIds") }, { status: 400 });
  }

  if (presetIds.length < 2) {
    return NextResponse.json({ error: msg("apiErrMinDocs") }, { status: 400 });
  }
  if (presetIds.length > MAX_DOCS) {
    return NextResponse.json(
      { error: msg("apiErrMaxDocs", { max: MAX_DOCS }) },
      { status: 400 }
    );
  }

  const inputs: ParseInput[] = [];
  for (const id of presetIds as string[]) {
    const doc = PRESET_DOCUMENTS.find(d => d.id === id);
    if (!doc) {
      return NextResponse.json(
        { error: msg("apiErrUnknownPreset", { id }) },
        { status: 400 }
      );
    }
    try {
      // The corpus lives under public/, which is served statically but is not part of the
      // function bundle by default. next.config.ts traces it in explicitly.
      const buffer = await readFile(path.join(process.cwd(), "public", "corpus", doc.filename));
      inputs.push({ buffer, label: doc.code, type: doc.type });
    } catch (e: unknown) {
      console.error(`Preset document ${doc.filename} could not be read:`, e);
      return NextResponse.json(
        { error: msg("apiErrPresetUnreadable", { id }), details: errorDetails(e) },
        { status: 500 }
      );
    }
  }

  return buildGraphResponse(inputs);
}

async function handleUploadParse(request: Request) {
  const formData = await request.formData();

  const docs: { file: File; label: string; type?: DocType }[] = [];
  for (let i = 0; i <= MAX_DOCS; i++) {
    const file = formData.get(`pdf${i}`);
    if (!file) break;
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: msg("apiErrNotAFile", { field: `pdf${i}` }) },
        { status: 400 }
      );
    }
    // The combined size cap below only counts file bytes, so an unbounded label would slip
    // past it. Labels are also embedded in every section label and scanned by the citation
    // proximity window, so a huge one is amplified across the whole parse.
    const rawLabel = formData.get(`label${i}`);
    if (rawLabel !== null && typeof rawLabel !== "string") {
      return NextResponse.json(
        { error: msg("apiErrLabelNotText", { field: `label${i}` }) },
        { status: 400 }
      );
    }
    const label = (rawLabel ?? "").trim();
    if (label.length > MAX_LABEL_CHARS) {
      return NextResponse.json(
        { error: msg("apiErrLabelTooLong", { max: MAX_LABEL_CHARS }) },
        { status: 400 }
      );
    }
    const rawType = formData.get(`type${i}`);
    if (rawType !== null && (typeof rawType !== "string" || !DOC_TYPES.includes(rawType as DocType))) {
      return NextResponse.json(
        { error: msg("apiErrBadType", { field: `type${i}`, types: DOC_TYPES.join(", ") }) },
        { status: 400 }
      );
    }
    const type = rawType === null ? undefined : (rawType as DocType);

    docs.push({ file, label, ...(type ? { type } : {}) });
  }

  if (docs.length < 2) {
    return NextResponse.json({ error: msg("apiErrMinDocs") }, { status: 400 });
  }

  if (docs.length > MAX_DOCS) {
    return NextResponse.json(
      { error: msg("apiErrMaxDocs", { max: MAX_DOCS }) },
      { status: 400 }
    );
  }

  if (docs.some(d => !d.label)) {
    return NextResponse.json({ error: msg("apiErrEmptyLabel") }, { status: 400 });
  }

  const totalBytes = docs.reduce((sum, d) => sum + d.file.size, 0);
  if (totalBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: msg("apiErrSizeLimit", { max: MAX_UPLOAD_MB }) },
      { status: 413 }
    );
  }

  const inputs: ParseInput[] = await Promise.all(
    docs.map(async d => ({
      buffer: Buffer.from(await d.file.arrayBuffer()),
      label: d.label,
      ...(d.type ? { type: d.type } : {}),
    }))
  );

  return buildGraphResponse(inputs);
}

/**
 * Text extraction and graph construction, shared by both entry points so an upload and a
 * preset run cannot drift into producing different graphs from the same bytes.
 */
async function buildGraphResponse(inputs: ParseInput[]) {
  // Extract text, pdf-parse v2: PDFParse is a class, getText().text holds the content
  const { PDFParse } = await import("pdf-parse");
  const parsers = inputs.map(input => new PDFParse({ data: input.buffer }));
  let extracted;
  try {
    extracted = await Promise.all(parsers.map(p => p.getText()));
  } catch (e: unknown) {
    console.error("Error extracting text from PDFs:", e);
    return NextResponse.json(
      { error: msg("apiErrPdfRead"), details: errorDetails(e) },
      { status: 422 }
    );
  } finally {
    await Promise.all(parsers.map(p => p.destroy()));
  }

  const oversized = extracted.findIndex(e => e.text.length > MAX_CHARS_PER_DOC);
  if (oversized !== -1) {
    return NextResponse.json(
      { error: msg("apiErrTooMuchText", { index: oversized + 1 }) },
      { status: 413 }
    );
  }

  let graphData;
  try {
    graphData = analyzeCitationsAndBuildGraph(
      inputs.map((input, i) => ({
        text: extracted[i].text,
        label: input.label,
        ...(input.type ? { type: input.type } : {}),
      }))
    );
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e) {
      // The parser's own messages are diagnostic and English by design; it is a pure
      // library with no notion of the UI language. They are translated here, at the
      // boundary, and the raw message and pattern counts ride along in the payload so the
      // copyable error report still carries everything needed to debug a bad PDF.
      const err = e as { code: string; message: string; patternCounts?: Record<string, number>; docKey?: string };
      const label = err.docKey
        ? inputs[Number(err.docKey.replace("doc", ""))]?.label ?? err.docKey
        : "";
      return NextResponse.json(
        {
          error: err.code === "INSUFFICIENT_STRUCTURE"
            ? msg("apiErrNoStructure", { doc: label })
            : msg("apiErrMinDocs"),
          code: err.code,
          details: { message: err.message },
          ...(err.patternCounts ? { patternCounts: err.patternCounts } : {}),
          ...(err.docKey ? { docKey: err.docKey } : {}),
        },
        { status: 422 }
      );
    }
    console.error("Unexpected error building citation graph:", e);
    return NextResponse.json(
      { error: msg("apiErrUnexpected"), details: errorDetails(e) },
      { status: 500 }
    );
  }

  return NextResponse.json(graphData);
}
