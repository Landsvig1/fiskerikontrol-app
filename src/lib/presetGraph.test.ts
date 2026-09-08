import { describe, it, expect, vi } from "vitest";

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function () {
    return {
      getText: vi.fn().mockResolvedValue({
        text: "Artikel 1\nPDF provision one.\n\nArtikel 2\nPDF provision two.",
      }),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

import { buildGraphFromInputs, type ParseInput } from "./presetGraph";

describe("presetGraph buildGraphFromInputs", () => {
  it("builds a citation graph from pure HTML inputs without calling PDFParse", async () => {
    const doc1Html = `
      <html>
        <body>
          <div class="art">
            <p><strong>Artikel 1</strong></p>
            <p>EU fiskerikontrol krav.</p>
          </div>
          <div class="art">
            <p><strong>Artikel 2</strong></p>
            <p>Forbud mod ulovligt fiskeri jf. artikel 1.</p>
          </div>
        </body>
      </html>
    `;

    const doc2Html = `
      <html>
        <body>
          <p><strong>§ 1</strong></p>
          <p>Dansk bekendtgørelse i henhold til artikel 1.</p>
          <p><strong>§ 2</strong></p>
          <p>Overtrædelse af § 1 straffes med bøde.</p>
        </body>
      </html>
    `;

    const inputs: ParseInput[] = [
      {
        buffer: Buffer.from(doc1Html),
        label: "Forordning 1224/2009",
        filename: "forordning.html",
        contentType: "text/html",
        type: "eu",
      },
      {
        buffer: Buffer.from(doc2Html),
        label: "BEK 1197/2025",
        filename: "bek1197.html",
        contentType: "text/html",
        type: "bek",
      },
    ];

    const result = await buildGraphFromInputs(inputs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.docs).toHaveLength(2);
    expect(result.data.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.data.links.length).toBeGreaterThanOrEqual(1);
  });

  it("builds a citation graph from a mixed PDF and HTML input set", async () => {
    const html = `
      <div>
        <p><strong>§ 1</strong></p>
        <p>National gennemførelse af artikel 1.</p>
        <p><strong>§ 2</strong></p>
        <p>Yderligere regler.</p>
      </div>
    `;

    const inputs: ParseInput[] = [
      {
        buffer: Buffer.from("%PDF-1.4 mock pdf data"),
        label: "EU PDF Act",
        filename: "doc.pdf",
        type: "eu",
      },
      {
        buffer: Buffer.from(html),
        label: "National HTML Act",
        filename: "doc.html",
        type: "bek",
      },
    ];

    const result = await buildGraphFromInputs(inputs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.docs).toHaveLength(2);
    expect(result.data.docs[0].label).toBe("EU PDF Act");
    expect(result.data.docs[1].label).toBe("National HTML Act");
  });
});
