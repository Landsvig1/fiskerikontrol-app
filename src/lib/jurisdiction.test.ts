import { describe, it, expect } from "vitest";
import { classifyDocLabel, docJurisdiction, euSupremacyApplies, nodeJurisdiction } from "./jurisdiction";
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

  it("uses the authoritative type of a preset document instead of its label", () => {
    // "Fisheries Regulation Act" matches the EU pattern via "regulation" and cannot be
    // fixed by widening the national pattern, "EU Delegated Act" is a real EU label.
    const preset: DocRef[] = [{ id: "doc0", label: "Fisheries Regulation Act", type: "lov" }];
    expect(classifyDocLabel("Fisheries Regulation Act")).toBe("eu");
    expect(docJurisdiction(preset, "doc0")).toBe("national");
  });

  it("maps every preset type onto the legal hierarchy", () => {
    expect(docJurisdiction([{ id: "doc0", label: "", type: "eu" }], "doc0")).toBe("eu");
    expect(docJurisdiction([{ id: "doc0", label: "", type: "bek" }], "doc0")).toBe("national");
    expect(docJurisdiction([{ id: "doc0", label: "", type: "lov" }], "doc0")).toBe("national");
  });

  it("falls back to the label for a hand-uploaded document with no type", () => {
    const uploaded: DocRef[] = [
      { id: "doc0", label: "Bekendtgørelse om logbog" },
      { id: "doc1", label: "Regulation 1380/2013" },
    ];
    expect(docJurisdiction(uploaded, "doc0")).toBe("national");
    expect(docJurisdiction(uploaded, "doc1")).toBe("eu");
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

  it("prefers a preset type over both the doc label and the node label", () => {
    const docs: DocRef[] = [{ id: "doc0", label: "Fisheries Regulation Act", type: "lov" }];
    expect(
      nodeJurisdiction(docs, { doc: "doc0", label: "Fisheries Regulation Act Art. 14" })
    ).toBe("national");
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

describe("euSupremacyApplies", () => {
  const docs: DocRef[] = [
    { id: "doc0", label: "EU 1224/2009" },
    { id: "doc1", label: "BEK 1197/2025" },
    { id: "doc2", label: "EU 2023/2842" },
    { id: "doc3", label: "Logbogbekendtgørelsen" },
  ];
  const node = (doc: string, label: string) => ({ doc, label });

  it("holds when a national order derogates from an EU regulation", () => {
    expect(euSupremacyApplies(docs, node("doc1", "§ 4"), node("doc0", "Art. 9"))).toBe(true);
  });

  it("does not hold between two EU regulations", () => {
    expect(euSupremacyApplies(docs, node("doc2", "Art. 3"), node("doc0", "Art. 9"))).toBe(false);
  });

  it("does not hold between two national orders", () => {
    expect(euSupremacyApplies(docs, node("doc3", "§ 2"), node("doc1", "§ 4"))).toBe(false);
  });

  it("does not hold when an EU regulation cites a national order", () => {
    // The direction matters: EU law does not gain precedence from being the citing side.
    expect(euSupremacyApplies(docs, node("doc0", "Art. 9"), node("doc1", "§ 4"))).toBe(false);
  });

  it("does not hold when either side classifies as unknown", () => {
    const withUnknown: DocRef[] = [...docs, { id: "doc4", label: "Annex III" }];
    expect(euSupremacyApplies(withUnknown, node("doc4", "Annex III"), node("doc0", "Art. 9"))).toBe(false);
    expect(euSupremacyApplies(withUnknown, node("doc1", "§ 4"), node("doc4", "Annex III"))).toBe(false);
  });

  it("does not hold when the citing section is missing from the graph", () => {
    // A conflict record can name a source node that was filtered out; absence is not evidence.
    expect(euSupremacyApplies(docs, null, node("doc0", "Art. 9"))).toBe(false);
    expect(euSupremacyApplies(docs, undefined, node("doc0", "Art. 9"))).toBe(false);
  });

  it("uses the authoritative preset type over a misleading label", () => {
    const preset: DocRef[] = [
      { id: "doc0", label: "Kontrolforordningen", type: "eu" },
      { id: "doc1", label: "Fisheries Regulation Act", type: "lov" },
    ];
    expect(euSupremacyApplies(preset, node("doc1", "§ 4"), node("doc0", "Art. 9"))).toBe(true);
  });
});
