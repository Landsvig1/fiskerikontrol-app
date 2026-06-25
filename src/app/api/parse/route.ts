import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { analyzeCitationsAndBuildGraph } from "@/lib/parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const controlPdfFile = formData.get("controlPdf") as File | null;
    const implPdfFile = formData.get("implPdf") as File | null;

    if (!controlPdfFile || !implPdfFile) {
      return NextResponse.json(
        { error: "Begge PDF-filer (Rammeforordning og Gennemførelsesforordning) skal uploades." },
        { status: 400 }
      );
    }

    // Convert Files to ArrayBuffers then Buffers
    const controlArrayBuffer = await controlPdfFile.arrayBuffer();
    const implArrayBuffer = await implPdfFile.arrayBuffer();

    const controlBuffer = Buffer.from(controlArrayBuffer);
    const implBuffer = Buffer.from(implArrayBuffer);

    // Extract text using pdf-parse
    console.log("Parsing Control PDF...");
    const controlParser = new PDFParse({ data: controlBuffer });
    const controlData = await controlParser.getText();
    
    console.log("Parsing Implementation PDF...");
    const implParser = new PDFParse({ data: implBuffer });
    const implData = await implParser.getText();

    // Build the citation network graph
    console.log("Running network analysis...");
    const graphData = analyzeCitationsAndBuildGraph(
      controlData.text,
      implData.text
    );

    return NextResponse.json(graphData);
  } catch (error: any) {
    console.error("Error parsing PDFs on server:", error);
    return NextResponse.json(
      { error: `Fejl under parsing af PDF: ${error.message || error}` },
      { status: 500 }
    );
  }
}
