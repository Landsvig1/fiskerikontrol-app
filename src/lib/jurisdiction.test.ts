import { describe, it, expect } from "vitest";
import { classifyDocLabel, docJurisdiction, nodeJurisdiction } from "./jurisdiction";
import type { DocRef } from "./docDisplay";
import { PRESET_DOCUMENTS } from "./presetCorpus";

describe("classifyDocLabel", () => {
  it("classifies EU regulations", () => {
    expect(classifyDocLabel("EU 1224/2009")).toBe("eu");
    expect(classifyDocLabel("EU 2023/2842")).toBe("eu");
    expect(classifyDocLabel("Forordning (EF) nr. 1224/2009")).toBe("eu");
    expect(classifyDocLabel("Regulation 1380/2013")).toBe("eu");
  });

  it("classifies Danish national acts", () => {
    expect(classifyDocLabel("BEK 1197/2025")).toBe("national");
    expect(classifyDocLabel("Bekendtgørelse om logbog")).toBe("national");
    expect(classifyDocLabel("LBK 205/2023")).toBe("national");
    expect(classifyDocLabel("Fiskeriloven LOV 205")).toBe("national");
  });

  it("treats a national act that names the EU act it transposes as national", () => {
    expect(classifyDocLabel("BEK 1144/2025 om gennemførelse af forordning 1224/2009")).toBe("national");
  });

  it("returns unknown rather than guessing", () => {
    expect(classifyDocLabel("")).toBe("unknown");
    expect(classifyDocLabel("Annex III")).toBe("unknown");
  });

  it("does not match 'lov' inside a longer word", () => {
    expect(classifyDocLabel("EU lovgivning om fiskeri")).toBe("eu");
  });
});

describe("docJurisdiction", () => {
  const docs: DocRef[] = [
    { id: "doc0", label: "EU 1224/2009" },
    { id: "doc1", label: "BEK 1197/2025" },
  ];

  it("resolves by label, not by docId ordering", () => {
    expect(docJurisdiction(docs, "doc0")).toBe("eu");
    expect(docJurisdiction(docs, "doc1")).toBe("national");
  });

  it("yields the same verdict when the corpus is uploaded in reverse order", () => {
    const reversed: DocRef[] = [
      { id: "doc0", label: "BEK 1197/2025" },
      { id: "doc1", label: "EU 1224/2009" },
    ];
    expect(docJurisdiction(reversed, "doc0")).toBe("national");
    expect(docJurisdiction(reversed, "doc1")).toBe("eu");
  });

  it("returns unknown for an unregistered docId", () => {
    expect(docJurisdiction(docs, "doc9")).toBe("unknown");
  });
});

describe("nodeJurisdiction", () => {
  it("falls back to the node label when the doc is unregistered", () => {
    expect(
      nodeJurisdiction([], { doc: "doc0", label: "EU 2023/2842 Art. 14" })
    ).toBe("eu");
    expect(
      nodeJurisdiction([], { doc: "doc1", label: "BEK 1197/2025 § 4" })
    ).toBe("national");
  });

  it("prefers the docs array over the node label", () => {
    const docs: DocRef[] = [{ id: "doc0", label: "BEK 1197/2025" }];
    expect(nodeJurisdiction(docs, { doc: "doc0", label: "Art. 14" })).toBe("national");
  });
});

describe("classifyDocLabel against the bundled corpus", () => {
  // The preset upload path sends doc.code as the label, so every code must agree with the
  // declared type. A table test over the real corpus is what catches a regex change that
  // happens to keep the hand-picked examples working.
  it.each(PRESET_DOCUMENTS.map((d) => [d.code, d.type] as const))(
    "classifies preset code %s",
    (code, type) => {
      expect(classifyDocLabel(code)).toBe(type === "eu" ? "eu" : "national");
    }
  );

  it("classifies idiomatic Danish compound act names", () => {
    // These are the labels a caseworker types by hand. Before the compound fix they all
    // returned "unknown", which downstream code rendered as a positive national-law claim.
    expect(classifyDocLabel("Kontrolforordningen")).toBe("eu");
    expect(classifyDocLabel("Gennemførelsesforordningen")).toBe("eu");
    expect(classifyDocLabel("Logbogbekendtgørelsen")).toBe("national");
    expect(classifyDocLabel("Fiskeriloven")).toBe("national");
  });

  it("does not read an English-labelled Danish order as EU law", () => {
    expect(classifyDocLabel("Fisheries Regulation Order")).toBe("national");
    expect(classifyDocLabel("Logbook Executive Order")).toBe("national");
  });

  it("still classifies an EU delegated act as EU", () => {
    // Guards the deliberate omission of "act" from the national markers.
    expect(classifyDocLabel("EU Delegated Act")).toBe("eu");
    expect(classifyDocLabel("Delegated Regulation (Control)")).toBe("eu");
  });
});
