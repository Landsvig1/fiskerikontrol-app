// @vitest-environment node
//
// This is a server-side API route test with no DOM dependency. jsdom's File/FormData
// classes aren't recognized by Node's undici-based Request parser, which fails a
// webidl.is.File() check when jsdom-constructed Files are appended to a FormData body ,
// running this file under Node's own runtime avoids that jsdom/undici class mismatch.
import { describe, it, expect, vi, beforeEach } from "vitest";

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
import { clearPresetGraphCache } from "@/lib/presetGraph";

// The corpus cache is process-wide; clearing it keeps preset assertions independent of the
// order tests run in.
beforeEach(() => clearPresetGraphCache());
import { MAX_UPLOAD_MB } from "@/lib/uploadLimits";
import { PRESET_DOCUMENTS } from "@/lib/presetCorpus";

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
    expect(body.error).toMatch(/mindst 2 PDF-dokumenter/i);
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
    expect(body.error).toMatch(/skal have et navn/i);
  });

  it("carries an authoritative preset type through to the returned docs", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "Fisheries Regulation Act");
    fd.append("type0", "lov");
    fd.append("pdf1", pdf("b.pdf"));
    fd.append("label1", "EU 1224/2009");
    fd.append("type1", "eu");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toEqual([
      { id: "doc0", label: "Fisheries Regulation Act", type: "lov" },
      { id: "doc1", label: "EU 1224/2009", type: "eu" },
    ]);
  });

  it("omits the type for hand-uploaded documents that send none", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "A");
    fd.append("pdf1", pdf("b.pdf"));
    fd.append("label1", "B");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toEqual([
      { id: "doc0", label: "A" },
      { id: "doc1", label: "B" },
    ]);
  });

  it("rejects an unrecognised document type", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf"));
    fd.append("label0", "A");
    fd.append("type0", "directive");
    fd.append("pdf1", pdf("b.pdf"));
    fd.append("label1", "B");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type0 skal være en af/i);
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
    expect(body.error).toMatch(/mindst 2 PDF-dokumenter/i);
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
    expect(body.error).toMatch(/højst 12 PDF-dokumenter/i);
  });

  it("rejects a combined upload over the platform-safe size cap", async () => {
    const fd = new FormData();
    fd.append("pdf0", pdf("a.pdf", 3 * 1024 * 1024));
    fd.append("label0", "A");
    fd.append("pdf1", pdf("b.pdf", 3 * 1024 * 1024));
    fd.append("label1", "B");

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(413);
    const body = await res.json();
    // Danish, and it names the same number the upload screen warns about.
    expect(body.error).toMatch(new RegExp(`${MAX_UPLOAD_MB} MB`));
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

  it("rejects a non-multipart, non-JSON content type", async () => {
    const res = await POST(
      new Request("http://localhost/api/parse", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "hello",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/multipart\/form-data eller JSON/i);
  });
});

describe("/api/parse preset ids", () => {
  it("analyses presets from ids alone, with no file bytes in the request", async () => {
    const ids = ["eu-1224-2009", "bek-1197-2025"];
    const res = await POST(makeJsonRequest({ presetIds: ids }));

    expect(res.status).toBe(200);
    const body = await res.json();
    // The labels and the authoritative types come from the corpus, not from the client.
    expect(body.docs).toEqual([
      { id: "doc0", label: "EU 1224/2009", type: "eu" },
      { id: "doc1", label: "BEK 1197/2025", type: "bek" },
    ]);
  });

  it("accepts every preset in the catalog", async () => {
    // Guards against a preset whose file was renamed or never committed: the route reads
    // these from disk now, so a bad entry is a 500 in front of the user.
    const res = await POST(makeJsonRequest({ presetIds: PRESET_DOCUMENTS.map((d) => d.id) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toHaveLength(PRESET_DOCUMENTS.length);
  });

  it("rejects an unknown preset id", async () => {
    const res = await POST(makeJsonRequest({ presetIds: ["eu-1224-2009", "not-a-document"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not-a-document/);
  });

  it("rejects fewer than 2 preset ids", async () => {
    const res = await POST(makeJsonRequest({ presetIds: ["eu-1224-2009"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/mindst 2 PDF-dokumenter/i);
  });

  it("rejects a presetIds field that is not a list of strings", async () => {
    const res = await POST(makeJsonRequest({ presetIds: "eu-1224-2009" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/presetIds/);
  });

  // UploadScreen renders the details block verbatim for the user to copy, so a stack trace
  // there ships absolute build-machine paths to the browser.
  describe("error detail exposure", () => {
    function brokenMultipart(): Request {
      return new Request("http://localhost/api/parse", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=----nope" },
        body: "not a real multipart body",
      });
    }

    it("includes the stack outside production so a bad PDF stays debuggable", async () => {
      const res = await POST(brokenMultipart());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.details.message).toBeTruthy();
      expect(body.details.stack).toBeTruthy();
    });

    it("withholds the stack in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      try {
        const res = await POST(brokenMultipart());
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.details.message).toBeTruthy();
        expect(body.details.stack).toBeUndefined();
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  it("rejects a malformed JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JSON kunne ikke læses/i);
  });
});
