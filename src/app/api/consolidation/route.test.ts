// @vitest-environment node
//
// Server-side route test with no DOM dependency, for the same reason as the parse route
// test: jsdom's File/FormData classes are not recognised by Node's undici-based Request.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Two documents that cite each other, so the corpus produces a real rollup without reading
// the bundled PDFs. Doc B amends Article 1 of doc A, which is the relation the consolidation
// ledger exists to surface.
const DOC_A = `Artikel 1
Logbogsforpligtelse
Foereren skal foere logbog.

Artikel 2
Undtagelser
Uanset artikel 1 kan mindre fartoejer fritages.`;

const DOC_B = `Artikel 1
AEndringer
I forordning (EF) nr. 1224/2009 foretages foelgende aendringer: 1) Artikel 1 aendres saaledes.

Artikel 2
Henvisning
Kravene i artikel 1 i forordning (EF) nr. 1224/2009 finder anvendelse.`;

// Keyed off the buffer identity rather than an incrementing counter: a shared counter makes
// which fixture a test receives depend on how many parser instances earlier tests built,
// which the corpus cache now changes.
const parserFor = vi.fn();

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function (opts: { data: Buffer }) {
    parserFor(opts);
    const text = opts?.data?.length && opts.data.length % 2 === 1 ? DOC_B : DOC_A;
    return {
      getText: vi.fn().mockResolvedValue({ text }),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

import { GET } from "./route";
import { clearPresetGraphCache } from "@/lib/presetGraph";

// The corpus cache is process-wide, so it would otherwise leak between tests and between
// files, making assertions depend on execution order.
beforeEach(() => {
  clearPresetGraphCache();
  parserFor.mockClear();
});

function get(query: string): Request {
  return new Request(`http://localhost/api/consolidation${query}`);
}

const TWO_DOCS = "docs=eu-1224-2009,eu-2023-2842";

describe("/api/consolidation", () => {
  it("rejects fewer than 2 documents and says which ids exist", async () => {
    const res = await GET(get("?docs=eu-1224-2009"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/mindst 2 dokumenter/i);
    // A caller that guessed wrong needs the vocabulary, not just a rejection.
    expect(body.availableDocs.map((d: { id: string }) => d.id)).toContain("eu-1224-2009");
  });

  it("rejects an unknown document id", async () => {
    const res = await GET(get("?docs=eu-1224-2009,ikke-et-dokument"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Ukendt dokument-id/i);
  });

  it("ranks provisions and hands back a UI link for each", async () => {
    const res = await GET(get(`?${TWO_DOCS}`));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.corpus.docs).toHaveLength(2);
    expect(body.provisions.length).toBeGreaterThan(0);

    const top = body.provisions[0];
    expect(top).toHaveProperty("actCount");
    expect(top).toHaveProperty("amendCount");
    // The link reproduces the same corpus and selects the same provision, so a caller can
    // hand a person the screen it just read.
    // Root-relative, not a bare query string: a bare "?docs=..." is a relative reference
    // that resolves against this route's own path, sending a caller back to the API.
    expect(top.url.startsWith("/?")).toBe(true);
    expect(top.url).toContain("docs=eu-1224-2009%2Ceu-2023-2842");
    expect(top.url).toContain("view=consolidation");
    expect(top.url).toContain(`p=${top.id}`);
  });

  it("returns the full ledger for one provision", async () => {
    const listing = await (await GET(get(`?${TWO_DOCS}`))).json();
    const targetId = listing.provisions[0].id;

    const res = await GET(get(`?${TWO_DOCS}&p=${targetId}`));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.provision.id).toBe(targetId);
    expect(body.citedBy.length).toBeGreaterThan(0);
    for (const citation of body.citedBy) {
      expect(citation.source).toHaveProperty("label");
      expect(citation).toHaveProperty("modality");
      expect(citation).toHaveProperty("amends");
    }
  });

  it("404s an unknown provision but points at where to look instead", async () => {
    const res = await GET(get(`?${TWO_DOCS}&p=doc0_sec_9999`));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/findes ikke/i);
    expect(body.topProvisions.length).toBeGreaterThan(0);
  });

  it("serves the cross-document amendment ledger", async () => {
    const res = await GET(get(`?${TWO_DOCS}&view=amendments`));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.amendmentCount).toBe(body.amendments.length);
    // The attribution that holds is the act, not the article: an amending regulation quotes
    // the replacement text it introduces, headings and all, and the heading splitter reads
    // those quoted headings as its own sections. The payload has to say so.
    expect(body.caveat).toMatch(/amendingAct/);
    for (const entry of body.amendments) {
      // A ledger entry is an act changing a provision in *another* act.
      expect(entry.source.doc).not.toBe(entry.target.doc);
      expect(entry.amendingAct).toBe(entry.source.doc);
    }
  });

  it("collapses a repeated document id instead of analysing the act twice", async () => {
    // Loaded twice, one act becomes two documents carrying identical text, and every
    // self-reference inside it is then reported as a citation between two separate acts.
    const res = await GET(get("?docs=eu-1224-2009,eu-1224-2009,eu-2023-2842"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.corpus.docs).toHaveLength(2);
    expect(body.corpus.docs.map((d: { id: string }) => d.id)).toEqual([
      "eu-1224-2009",
      "eu-2023-2842",
    ]);
  });

  it("parses a corpus once and serves the repeat request from cache", async () => {
    // The bundled PDFs are immutable for the life of the deployment, so re-parsing them per
    // request is pure repeated work. This is the property that makes a shared link open
    // quickly instead of paying a full cold parse every time.
    const first = await GET(get(`?${TWO_DOCS}`));
    expect(first.status).toBe(200);
    const afterFirst = parserFor.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);

    const second = await GET(get(`?${TWO_DOCS}&p=doc0_sec_1`));
    expect(parserFor.mock.calls.length).toBe(afterFirst);

    // A different corpus is a different key and does parse.
    await GET(get("?docs=eu-1224-2009,eu-1380-2013"));
    expect(parserFor.mock.calls.length).toBeGreaterThan(afterFirst);
    void second;
  });

  it("does not let two different document orders share a cache entry", async () => {
    // Node ids are positional ("doc0_sec_14"), so the same ids in a different order are a
    // different graph. A sorted cache key would hand back ids that name the wrong document.
    const forward = await (await GET(get("?docs=eu-1224-2009,eu-2023-2842"))).json();
    const reversed = await (await GET(get("?docs=eu-2023-2842,eu-1224-2009"))).json();

    expect(forward.corpus.docs.map((d: { id: string }) => d.id)).toEqual([
      "eu-1224-2009",
      "eu-2023-2842",
    ]);
    expect(reversed.corpus.docs.map((d: { id: string }) => d.id)).toEqual([
      "eu-2023-2842",
      "eu-1224-2009",
    ]);
  });

  it("clamps the listing limit instead of trusting it", async () => {
    const res = await GET(get(`?${TWO_DOCS}&limit=99999`));
    expect(res.status).toBe(200);
    expect((await res.json()).provisions.length).toBeLessThanOrEqual(500);

    const nonsense = await GET(get(`?${TWO_DOCS}&limit=abc`));
    expect(nonsense.status).toBe(200);
  });
});
