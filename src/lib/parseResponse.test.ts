import { describe, it, expect } from "vitest";
import { isGraphData, readErrorResponse } from "./parseResponse";
import { getT } from "./i18n";

function validResponse() {
  return {
    nodes: [
      {
        id: "doc0_sec_9",
        number: 9,
        label: "Art. 9",
        title: "VMS",
        doc: "doc0",
        theme: "Overvågning",
        body: "Fartøjer skal have VMS installeret.",
      },
    ],
    links: [
      {
        source: "doc0_sec_9",
        target: "doc0_sec_10",
        type: "citation",
        modality: "Obligation",
        snippet: "",
        context: "",
      },
    ],
    overlaps: [{ target: "doc0_sec_9", sources: ["doc0_sec_10"], count: 1, citations: [] }],
    conflicts: [
      { target: "doc0_sec_9", modalities: ["Obligation"], description: "", citations: [] },
    ],
    docs: [{ id: "doc0", label: "EU 1224/2009" }],
  };
}

describe("isGraphData", () => {
  it("accepts a well-formed parse response", () => {
    expect(isGraphData(validResponse())).toBe(true);
  });

  it("accepts an empty but structurally complete response", () => {
    expect(isGraphData({ nodes: [], links: [], overlaps: [], conflicts: [], docs: [] })).toBe(true);
  });

  it("rejects the route's error object, which is also valid JSON", () => {
    expect(isGraphData({ error: "Unhandled server error: boom" })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isGraphData(null)).toBe(false);
    expect(isGraphData("nodes")).toBe(false);
    expect(isGraphData([])).toBe(false);
  });

  it("rejects a response missing any one of the five collections", () => {
    for (const key of ["nodes", "links", "overlaps", "conflicts", "docs"]) {
      const body = validResponse() as Record<string, unknown>;
      delete body[key];
      expect(isGraphData(body), `missing ${key}`).toBe(false);
    }
  });

  it("rejects a node missing the fields the views read", () => {
    const body = validResponse() as { nodes: Array<Record<string, unknown>> };
    delete body.nodes[0].body;
    expect(isGraphData(body)).toBe(false);
  });

  it("rejects a node whose number arrived as a string", () => {
    const body = validResponse() as { nodes: Array<Record<string, unknown>> };
    body.nodes[0].number = "9";
    expect(isGraphData(body)).toBe(false);
  });

  it("rejects a link whose endpoints are not ids", () => {
    const body = validResponse() as { links: Array<Record<string, unknown>> };
    body.links[0].target = { id: "doc0_sec_10" };
    expect(isGraphData(body)).toBe(false);
  });

  it("rejects a doc entry without an id and label", () => {
    const body = validResponse() as { docs: Array<Record<string, unknown>> };
    delete body.docs[0].label;
    expect(isGraphData(body)).toBe(false);
  });

  it("does not enforce the modality union, which has a runtime fallback in graphColors", () => {
    const body = validResponse() as { links: Array<Record<string, unknown>> };
    body.links[0].modality = "Recommendation";
    expect(isGraphData(body)).toBe(true);
  });
});

describe("readErrorResponse", () => {
  const t = getT();

  function res(body: string, status: number, contentType = "text/html"): Response {
    return new Response(body, { status, headers: { "Content-Type": contentType } });
  }

  it("uses the route's own Danish error when the body is JSON", async () => {
    const { message } = await readErrorResponse(
      res(JSON.stringify({ error: "Der kræves mindst 2 PDF-dokumenter." }), 400, "application/json"),
      t
    );
    expect(message).toBe("Der kræves mindst 2 PDF-dokumenter.");
  });

  it("explains a 413 whose body is not JSON", async () => {
    // What the platform returns when a request body exceeds its own limit, before the
    // route ever runs. This used to surface as "Ukendt fejl. Prøv igen."
    const { message, parsedBody } = await readErrorResponse(res("<html>Payload Too Large</html>", 413), t);
    expect(message).toBe(t("uploadTooLargeError"));
    expect(message).not.toBe(t("unknownError"));
    expect(parsedBody).toContain("Payload Too Large");
  });

  it("names the status for any other non-JSON failure", async () => {
    const { message } = await readErrorResponse(res("<html>Bad Gateway</html>", 502), t);
    expect(message).toContain("502");
  });

  it("falls back on a JSON body that carries no error string", async () => {
    const { message } = await readErrorResponse(res(JSON.stringify({ ok: false }), 500, "application/json"), t);
    expect(message).toContain("500");
  });
});
