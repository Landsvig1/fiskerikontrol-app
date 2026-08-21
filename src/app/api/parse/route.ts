import { NextResponse } from "next/server";
import { analyzeCitationsAndBuildGraph, type DocType } from "@/lib/parser";
import DOMMatrixPolyfill from "dommatrix";

// pdfjs-dist (bundled in pdf-parse) constructs a DOMMatrix at module load time
// for its canvas module. Node has no DOMMatrix global, so importing pdf-parse
// crashes for any PDF that pulls in that code path unless we polyfill it first.
if (!("DOMMatrix" in globalThis)) {
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrixPolyfill }).DOMMatrix = DOMMatrixPolyfill;
}

function errorDetails(e: unknown) {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack };
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
      { error: `Unhandled server error: ${details.message}`, details },
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

async function handleParse(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  const formData = await request.formData();

  const docs: { file: File; label: string; type?: DocType }[] = [];
  for (let i = 0; i <= MAX_DOCS; i++) {
    const file = formData.get(`pdf${i}`);
    if (!file) break;
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: `Field pdf${i} must be a file upload.` },
        { status: 400 }
      );
    }
    // The combined size cap below only counts file bytes, so an unbounded label would slip
    // past it. Labels are also embedded in every section label and scanned by the citation
    // proximity window, so a huge one is amplified across the whole parse.
    const rawLabel = formData.get(`label${i}`);
    if (rawLabel !== null && typeof rawLabel !== "string") {
      return NextResponse.json(
        { error: `Field label${i} must be a text value.` },
        { status: 400 }
      );
    }
    const label = (rawLabel ?? "").trim();
    if (label.length > MAX_LABEL_CHARS) {
      return NextResponse.json(
        { error: `Document labels must be ${MAX_LABEL_CHARS} characters or fewer.` },
        { status: 400 }
      );
    }
    const rawType = formData.get(`type${i}`);
    if (rawType !== null && (typeof rawType !== "string" || !DOC_TYPES.includes(rawType as DocType))) {
      return NextResponse.json(
        { error: `Field type${i} must be one of: ${DOC_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }
    const type = rawType === null ? undefined : (rawType as DocType);

    docs.push({ file, label, ...(type ? { type } : {}) });
  }

  if (docs.length < 2) {
    return NextResponse.json(
      { error: "At least 2 PDF documents are required." },
      { status: 400 }
    );
  }

  if (docs.length > MAX_DOCS) {
    return NextResponse.json(
      { error: `At most ${MAX_DOCS} PDF documents are supported per request.` },
      { status: 400 }
    );
  }

  if (docs.some(d => !d.label)) {
    return NextResponse.json(
      { error: "All document labels must be non-empty strings." },
      { status: 400 }
    );
  }

  // Enforce 10 MB combined size limit
  const totalBytes = docs.reduce((sum, d) => sum + d.file.size, 0);
  if (totalBytes > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Combined file size exceeds the 10 MB limit." },
      { status: 413 }
    );
  }

  const buffers = await Promise.all(docs.map(d => d.file.arrayBuffer().then(Buffer.from)));

  // Extract text, pdf-parse v2: PDFParse is a class, getText().text holds the content
  const { PDFParse } = await import("pdf-parse");
  const parsers = buffers.map(buf => new PDFParse({ data: buf }));
  let extracted;
  try {
    extracted = await Promise.all(parsers.map(p => p.getText()));
  } catch (e: unknown) {
    console.error("Error extracting text from uploaded PDFs:", e);
    const details = errorDetails(e);
    return NextResponse.json(
      {
        error: `Could not read one of the PDF files. It may be corrupted, password-protected, or not a valid PDF: ${details.message}`,
        details,
      },
      { status: 422 }
    );
  } finally {
    await Promise.all(parsers.map(p => p.destroy()));
  }

  const oversized = extracted.findIndex(e => e.text.length > MAX_CHARS_PER_DOC);
  if (oversized !== -1) {
    return NextResponse.json(
      {
        error: `Document ${oversized + 1} contains too much text to analyse (limit ${MAX_CHARS_PER_DOC.toLocaleString("en-US")} characters).`,
      },
      { status: 413 }
    );
  }

  // Build graph, throws structured error if structure is insufficient
  let graphData;
  try {
    graphData = analyzeCitationsAndBuildGraph(
      docs.map((d, i) => ({ text: extracted[i].text, label: d.label, ...(d.type ? { type: d.type } : {}) }))
    );
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e) {
      const err = e as { code: string; message: string; patternCounts?: Record<string, number>; docKey?: string };
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          ...(err.patternCounts ? { patternCounts: err.patternCounts } : {}),
          ...(err.docKey ? { docKey: err.docKey } : {}),
        },
        { status: 422 }
      );
    }
    console.error("Unexpected error building citation graph:", e);
    const details = errorDetails(e);
    return NextResponse.json(
      { error: `Unexpected error: ${details.message}`, details },
      { status: 500 }
    );
  }

  return NextResponse.json(graphData);
}
