import { NextResponse } from "next/server";
import { type DocType } from "@/lib/parser";
import { PRESET_DOCUMENTS } from "@/lib/presetCorpus";
import { translations as da } from "@/lib/i18n";
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";
import {
  buildGraphFromInputs,
  readPresetInput,
  dedupePresetIds,
  presetCacheKey,
  getCachedPresetGraph,
  cachePresetGraph,
  type ParseInput,
} from "@/lib/presetGraph";

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

// Only the bundled preset corpus sends type${i}. It is the authoritative EU/national
// classification and drives the supremacy verdict in the audit memo, so an unrecognised
// value is rejected rather than coerced, and an absent one falls back to label matching.
const DOC_TYPES: readonly DocType[] = ["eu", "bek", "lov"];

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

  // Deduplicated on the same rule the consolidation route uses, so one act named twice is
  // one document in both, and both derive the same cache key for the same request.
  const requestedIds = dedupePresetIds(presetIds as string[]);

  const unknown = requestedIds.find(id => !PRESET_DOCUMENTS.some(d => d.id === id));
  if (unknown) {
    return NextResponse.json(
      { error: msg("apiErrUnknownPreset", { id: unknown }) },
      { status: 400 }
    );
  }

  // The corpus PDFs are immutable for the life of the deployment, so a given id sequence
  // always parses to the same graph. This is the path a shared link takes when the app
  // restores a corpus from ?docs=, and re-parsing it there is what made opening a link feel
  // broken. Keyed on the requested order, because node ids are positional.
  const cacheKey = presetCacheKey(requestedIds);
  const cached = getCachedPresetGraph(cacheKey);
  if (cached) return NextResponse.json(cached);

  const inputs: ParseInput[] = [];
  for (const id of requestedIds) {
    const doc = PRESET_DOCUMENTS.find(d => d.id === id)!;
    try {
      inputs.push((await readPresetInput(doc.id))!);
    } catch (e: unknown) {
      console.error(`Preset document ${doc.filename} could not be read:`, e);
      return NextResponse.json(
        { error: msg("apiErrPresetUnreadable", { id }), details: errorDetails(e) },
        { status: 500 }
      );
    }
  }

  return buildGraphResponse(inputs, cacheKey);
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
 * Maps a corpus build onto this route's response shapes. The extraction and the analysis
 * themselves live in @/lib/presetGraph, shared with the read-only consolidation route.
 */
async function buildGraphResponse(inputs: ParseInput[], cacheKey?: string) {
  const result = await buildGraphFromInputs(inputs);
  if (result.ok) {
    // Only preset runs pass a key. An upload's bytes have no stable identity to cache on.
    if (cacheKey) cachePresetGraph(cacheKey, result.data);
    return NextResponse.json(result.data);
  }

  const failure = result.failure;
  switch (failure.kind) {
    case "pdf_read":
      console.error("Error extracting text from PDFs:", failure.cause);
      return NextResponse.json(
        { error: msg("apiErrPdfRead"), details: errorDetails(failure.cause) },
        { status: 422 }
      );

    case "too_much_text":
      return NextResponse.json(
        { error: msg("apiErrTooMuchText", { index: failure.index + 1 }) },
        { status: 413 }
      );

    case "insufficient_structure": {
      // The parser's own messages are diagnostic and English by design; it is a pure
      // library with no notion of the UI language. They are translated here, at the
      // boundary, and the raw message and pattern counts ride along in the payload so the
      // copyable error report still carries everything needed to debug a bad PDF.
      const label = failure.docKey
        ? inputs[Number(failure.docKey.replace("doc", ""))]?.label ?? failure.docKey
        : "";
      return NextResponse.json(
        {
          error: msg("apiErrNoStructure", { doc: label }),
          code: failure.code,
          details: { message: failure.message },
          ...(failure.patternCounts ? { patternCounts: failure.patternCounts } : {}),
          ...(failure.docKey ? { docKey: failure.docKey } : {}),
        },
        { status: 422 }
      );
    }

    case "too_few_documents":
      return NextResponse.json(
        { error: msg("apiErrMinDocs"), code: failure.code, details: { message: failure.message } },
        { status: 422 }
      );

    case "unexpected":
      console.error("Unexpected error building citation graph:", failure.cause);
      return NextResponse.json(
        { error: msg("apiErrUnexpected"), details: errorDetails(failure.cause) },
        { status: 500 }
      );
  }
}
