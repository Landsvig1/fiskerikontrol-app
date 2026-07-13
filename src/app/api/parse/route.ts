import { NextResponse } from "next/server";
import { analyzeCitationsAndBuildGraph } from "@/lib/parser";
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
// indexed pdf${i} loop below has no other bound — without this, a request crafted outside
// the UI could submit an unbounded number of small PDFs (each triggering its own pdf-parse
// invocation) while still fitting under the combined size cap.
const MAX_DOCS = 12;

async function handleParse(request: Request) {
  const formData = await request.formData();

  const docs: { file: File; label: string }[] = [];
  for (let i = 0; i <= MAX_DOCS; i++) {
    const file = formData.get(`pdf${i}`) as File | null;
    if (!file) break;
    const label = (formData.get(`label${i}`) as string | null)?.trim() ?? "";
    docs.push({ file, label });
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

  // Extract text — pdf-parse v2: PDFParse is a class, getText().text holds the content
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

  // Build graph — throws structured error if structure is insufficient
  let graphData;
  try {
    graphData = analyzeCitationsAndBuildGraph(
      docs.map((d, i) => ({ text: extracted[i].text, label: d.label }))
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
