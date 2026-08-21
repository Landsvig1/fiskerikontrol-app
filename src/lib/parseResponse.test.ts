import { describe, it, expect } from "vitest";
import { isGraphData } from "./parseResponse";

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
