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

  it("explains an outgoing prohibition link with prohibition-specific wording", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Prohibition",
    };

    const explanation = explainConnection(nodeB, nodeA, link, true, [], docs, "da");
    expect(explanation.headline).toContain("forbyder");
    expect(explanation.legalRole).toContain("Forbudsbestemmelse");
  });

  it("explains an outgoing permission link with permission-specific wording", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Permission",
    };

    const explanation = explainConnection(nodeB, nodeA, link, true, [], docs, "da");
    expect(explanation.headline).toContain("adgang eller hjemmel");
    expect(explanation.legalRole).toContain("Tilladelses-");
  });

  it("explains an incoming prohibition link from the other side", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Prohibition",
    };

    const explanation = explainConnection(nodeA, nodeB, link, false, [], docs, "da");
    expect(explanation.headline).toContain("forbyder");
    expect(explanation.legalRole).toContain("indskr\u00e6nket");
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


  it("explains an incoming permission link from the other side", () => {
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Permission",
    };

    const explanation = explainConnection(nodeA, nodeB, link, false, [], docs, "da");
    expect(explanation.headline).toContain("tillader fravigelse");
    expect(explanation.legalRole).toContain("fakultativ adgang");
  });

  it("makes no national-law claim when a document label cannot be classified", () => {
    // "Annex III" classifies as unknown. Before the fix the explainer collapsed unknown into
    // "not EU" and described both provisions as Danish national law.
    const unknownDocs: DocRef[] = [
      { id: "doc_eu", label: "EU 2023/2842" },
      { id: "doc_dk", label: "Annex III" },
    ];
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Obligation",
    };

    const explanation = explainConnection(nodeB, nodeA, link, true, [], unknownDocs, "da");
    expect(explanation.hierarchyContext).toContain("kan ikke afgøres");
    expect(explanation.hierarchyContext).not.toContain("bekendtgørelse");
  });

  it("emits the neutral English hierarchy string for an unclassifiable label", () => {
    const unknownDocs: DocRef[] = [
      { id: "doc_eu", label: "Annex III" },
      { id: "doc_dk", label: "Annex IV" },
    ];
    const link: GraphLink = {
      source: nodeB.id,
      target: nodeA.id,
      modality: "Obligation",
    };

    const explanation = explainConnection(nodeB, nodeA, link, true, [], unknownDocs, "en");
    expect(explanation.hierarchyContext).toContain("cannot be determined");
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
