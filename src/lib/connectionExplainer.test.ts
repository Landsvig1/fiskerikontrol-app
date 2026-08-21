import { describe, it, expect } from "vitest";
import { explainConnection } from "./connectionExplainer";
import { GraphNode, GraphLink, ConflictRecord, DocRef } from "./types";

describe("explainConnection", () => {
  const docs: DocRef[] = [
    { id: "doc_eu", label: "EU 2023/2842" },
    { id: "doc_dk", label: "Bekendtgørelse 1224/2009" }
  ];

  const nodeA: GraphNode = {
    id: "doc_eu_art_119",
    number: 119,
    label: "Art. 119",
    title: "Vejning af fiskerivarer",
    doc: "doc_eu",
    theme: "Vejning",
    body: "Alle fiskerivarer skal vejes ved landing."
  };

  const nodeB: GraphNode = {
    id: "doc_dk_sec_13",
    number: 13,
    label: "§ 13",
    title: "National undtagelse for kystfiskeri",
    doc: "doc_dk",
    theme: "Vejning",
    body: "Fartøjer under 12 meter kan undtages fra elektronisk vejerapport."
  };

  it("explains outgoing exception link from national to EU provision", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Exception",
      snippet: "Uanset forordningens art. 119 kan fartøjer..."
    };

    const explanation = explainConnection(nodeB, nodeA, link, true, [], docs, "da");
    expect(explanation.headline).toContain("fraviger kravene");
    expect(explanation.summary).toContain("specifik undtagelse");
    expect(explanation.legalRole).toContain("Undtagelsesbestemmelse");
    expect(explanation.hierarchyContext).toContain("administreres i overensstemmelse");
    expect(explanation.snippet).toBe("Uanset forordningens art. 119 kan fartøjer...");
    expect(explanation.hasConflict).toBe(false);
  });

  it("explains incoming direct citation from EU to national provision", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Obligation"
    };

    const explanation = explainConnection(nodeA, nodeB, link, false, [], docs, "da");
    expect(explanation.headline).toContain("henviser til");
    expect(explanation.summary).toContain("bygger direkte på");
    expect(explanation.hasConflict).toBe(false);
  });

  it("detects and flags conflict if present in conflict records", () => {
    const conflicts: ConflictRecord[] = [
      {
        target: nodeA.id,
        modalities: ["Obligation", "Exception"],
        description: "National bekendtgørelse fraviger ubetinget vejekrav i strid med EU-forordningen",
        citations: [{ source: nodeB.id, modality: "Exception", snippet: "...", context: "..." }]
      }
    ];

    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Exception"
    };

    const explanation = explainConnection(nodeA, nodeB, link, false, conflicts, docs, "da");
    expect(explanation.hasConflict).toBe(true);
    expect(explanation.conflictDescription).toContain("i strid med EU-forordningen");
  });
});
