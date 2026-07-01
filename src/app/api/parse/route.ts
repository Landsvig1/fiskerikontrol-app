import { NextResponse } from "next/server";
import { analyzeCitationsAndBuildGraph } from "@/lib/parser";

export async function POST(request: Request) {
  const formData = await request.formData();

  const pdfA = formData.get("pdfA") as File | null;
  const pdfB = formData.get("pdfB") as File | null;
  const labelA = (formData.get("labelA") as string | null)?.trim() ?? "";
  const labelB = (formData.get("labelB") as string | null)?.trim() ?? "";

  // Validate labels
  if (!labelA || !labelB) {
    return NextResponse.json(
      { error: "Both labelA and labelB must be non-empty strings." },
      { status: 400 }
    );
  }

  if (!pdfA || !pdfB) {
    return NextResponse.json(
      { error: "Both PDF files (pdfA and pdfB) are required." },
      { status: 400 }
    );
  }

  // Enforce 10 MB combined size limit
  const totalBytes = pdfA.size + pdfB.size;
  if (totalBytes > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Combined file size exceeds the 10 MB limit." },
      { status: 413 }
    );
  }

  const bufA = Buffer.from(await pdfA.arrayBuffer());
  const bufB = Buffer.from(await pdfB.arrayBuffer());

  // Extract text — pdf-parse v2: PDFParse is a class, getText().text holds the content
  const { PDFParse } = await import("pdf-parse");
  const parserA = new PDFParse({ data: bufA });
  const parserB = new PDFParse({ data: bufB });
  let dataA, dataB;
  try {
    [dataA, dataB] = await Promise.all([parserA.getText(), parserB.getText()]);
  } catch (e: unknown) {
    console.error("Error extracting text from uploaded PDFs:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Could not read one of the PDF files. It may be corrupted, password-protected, or not a valid PDF: ${message}` },
      { status: 422 }
    );
  } finally {
    await Promise.all([parserA.destroy(), parserB.destroy()]);
  }

  // Build graph — throws structured error if structure is insufficient
  let graphData;
  try {
    graphData = analyzeCitationsAndBuildGraph(dataA.text, dataB.text, labelA, labelB);
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
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Unexpected error: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ ...graphData, labelA, labelB });
}
