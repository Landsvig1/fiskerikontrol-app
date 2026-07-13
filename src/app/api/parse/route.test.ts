// @vitest-environment node
//
// This is a server-side API route test with no DOM dependency. jsdom's File/FormData
// classes aren't recognized by Node's undici-based Request parser, which fails a
// webidl.is.File() check when jsdom-constructed Files are appended to a FormData body —
// running this file under Node's own runtime avoids that jsdom/undici class mismatch.
import { describe, it, expect, vi } from "vitest";

vi.mock("pdf-parse", () => ({
  // A plain `function` (not an arrow) that explicitly returns an object: when invoked via
  // `new PDFParse(...)`, JS's constructor-return-override rule makes that returned object
  // the result, so this doubles as a mock constructor without a real class.
  PDFParse: vi.fn().mockImplementation(function () {
    return {
      getText: vi.fn().mockResolvedValue({
        text: "Article 1\nFirst provision.\n\nArticle 2\nSecond provision.",
      }),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

import { POST } from "./route";

function pdf(name: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: "application/pdf" });
}

function makeRequest(fd: FormData): Request {
  return new Request("http://localhost/api/parse", { method: "POST", body: fd });
}

describe("/api/parse", () => {
  it("rejects fewer than 2 documents", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "A");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least 2/i);
  });

  it("rejects a request where any document label is empty", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "A");
    fd.append("pdf1", pdf("b.pdf"));
    fd.append("label1", "");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non-empty/i);
  });

  it("stops the indexed pdf${i} loop at the first missing index, ignoring gaps", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "A");
    // pdf1 intentionally missing
    fd.append("pdf2", pdf("c.pdf"));
    fd.append("label2", "C");

    const res = await POST(makeRequest(fd));
    // Only doc0 was collected before the loop stopped at the missing pdf1, so this is
    // treated as a single-document (< 2) request, not a 2-document one with a gap.
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least 2/i);
  });

  it("rejects more than 12 documents", async () => {
    const fd = new FormData();
    for (let i = 0; i < 13; i++) {
      fd.append(`pdf${i}`, pdf(`doc${i}.pdf`));
      fd.append(`label${i}`, `Doc ${i}`);
    }

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at most 12/i);
  });

  it("rejects a combined size over 10MB", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf", 6 * 1024 * 1024));
    fd.append("label0", "A");
    fd.append("pdf1", pdf("b.pdf", 6 * 1024 * 1024));
    fd.append("label1", "B");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(413);
  });

  it("accepts a well-formed 3-document request and returns docs[] instead of labelA/labelB", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "Base Act");
    fd.append("pdf1", pdf("b.pdf"));
    fd.append("label1", "Impl A");
    fd.append("pdf2", pdf("c.pdf"));
    fd.append("label2", "Impl B");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toEqual([
      { id: "doc0", label: "Base Act" },
      { id: "doc1", label: "Impl A" },
      { id: "doc2", label: "Impl B" },
    ]);
    expect(body.labelA).toBeUndefined();
    expect(body.labelB).toBeUndefined();
    expect(Array.isArray(body.nodes)).toBe(true);
  });
});
