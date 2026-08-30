import { describe, it, expect } from "vitest";
import { buildConsolidation, buildAmendmentLedger } from "./consolidation";
import type { GraphData, GraphNode, GraphLink } from "./types";

function node(id: string, doc: string, label: string, extra: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    number: 1,
    label,
    title: "",
    doc,
    theme: "Generelle Bestemmelser",
    body: "",
    ...extra,
  };
}

function link(source: string, target: string, extra: Partial<GraphLink> = {}): GraphLink {
  return {
    source,
    target,
    type: "citation",
    modality: "Obligation",
    snippet: "",
    context: "",
    ...extra,
  };
}

function graph(nodes: GraphNode[], links: GraphLink[]): GraphData {
  return {
    nodes,
    links,
    overlaps: [],
    conflicts: [],
    docs: [
      { id: "doc0", label: "EU 1224/2009", type: "eu" },
      { id: "doc1", label: "EU 2023/2842", type: "eu" },
      { id: "doc2", label: "BEK 1144/2025", type: "bek" },
    ],
  };
}

describe("buildConsolidation", () => {
  it("ranks by distinct citing documents, not by raw citation count", () => {
    // Mirrors the bundled corpus: the comitology article collects far more citations than
    // anything else, but every one of them comes from inside its own act, while Art. 14 is
    // cited from three separate documents. Raw counts put the boilerplate first.
    const nodes = [
      node("doc0_sec_119", "doc0", "EU 1224/2009 Art. 119"),
      node("doc0_sec_14", "doc0", "EU 1224/2009 Art. 14"),
      node("doc0_a", "doc0", "EU 1224/2009 Art. 7"),
      node("doc0_b", "doc0", "EU 1224/2009 Art. 8"),
      node("doc0_c", "doc0", "EU 1224/2009 Art. 9"),
      node("doc0_d", "doc0", "EU 1224/2009 Art. 10"),
      node("doc1_a", "doc1", "EU 2023/2842 Art. 5"),
      node("doc2_a", "doc2", "BEK 1144/2025 § 2"),
    ];
    const links = [
      link("doc0_a", "doc0_sec_119"),
      link("doc0_b", "doc0_sec_119"),
      link("doc0_c", "doc0_sec_119"),
      link("doc0_d", "doc0_sec_119"),
      link("doc0_a", "doc0_sec_14"),
      link("doc1_a", "doc0_sec_14"),
      link("doc2_a", "doc0_sec_14"),
    ];

    const rollups = buildConsolidation(graph(nodes, links));

    expect(rollups[0].target.id).toBe("doc0_sec_14");
    expect(rollups[0].actCount).toBe(3);
    expect(rollups[0].incoming).toHaveLength(3);

    // The heavily cited boilerplate is still reported, just not first.
    const comitology = rollups.find(r => r.target.id === "doc0_sec_119")!;
    expect(comitology.incoming).toHaveLength(4);
    expect(comitology.actCount).toBe(1);
  });

  it("counts amendments and cross-document citations separately", () => {
    const nodes = [
      node("doc0_sec_4", "doc0", "EU 1224/2009 Art. 4"),
      node("doc0_x", "doc0", "EU 1224/2009 Art. 90"),
      node("doc1_a", "doc1", "EU 2023/2842 Art. 1"),
    ];
    const links = [
      link("doc1_a", "doc0_sec_4", { amends: true, isCrossDoc: true }),
      link("doc0_x", "doc0_sec_4"),
    ];

    const [rollup] = buildConsolidation(graph(nodes, links));

    expect(rollup.amendCount).toBe(1);
    expect(rollup.crossDocCount).toBe(1);
    expect(rollup.incoming).toHaveLength(2);
    // Amendments lead the ledger: they are the entries that change the text.
    expect(rollup.incoming[0].amends).toBe(true);
    expect(rollup.incoming[0].source.id).toBe("doc1_a");
  });

  it("excludes unresolved external placeholders from both ends", () => {
    const nodes = [
      node("doc0_sec_5", "doc0", "EU 1224/2009 Art. 5"),
      node("doc0_a", "doc0", "EU 1224/2009 Art. 6"),
      node("external_doc0_sec_900", "doc0", "Ekstern henvisning 900", {
        external: true,
        is_subnode: true,
      }),
    ];
    const links = [
      link("doc0_a", "doc0_sec_5"),
      link("doc0_a", "external_doc0_sec_900"),
      link("external_doc0_sec_900", "doc0_sec_5"),
    ];

    const rollups = buildConsolidation(graph(nodes, links));

    expect(rollups).toHaveLength(1);
    expect(rollups[0].target.id).toBe("doc0_sec_5");
    expect(rollups[0].incoming).toHaveLength(1);
    expect(rollups[0].incoming[0].source.id).toBe("doc0_a");
  });

  it("drops self-citations so a provision cannot inflate its own rollup", () => {
    const nodes = [node("doc0_sec_5", "doc0", "EU 1224/2009 Art. 5")];
    const links = [link("doc0_sec_5", "doc0_sec_5")];

    expect(buildConsolidation(graph(nodes, links))).toHaveLength(0);
  });

  it("resolves link endpoints that d3 has replaced with node objects", () => {
    // The client types widen source/target to string | GraphNode, because d3-force swaps in
    // node references in place once a simulation has run over the same data.
    const target = node("doc0_sec_5", "doc0", "EU 1224/2009 Art. 5");
    const source = node("doc1_a", "doc1", "EU 2023/2842 Art. 1");
    const links: GraphLink[] = [
      { source, target, type: "citation", modality: "Obligation", snippet: "", context: "" },
    ];

    const [rollup] = buildConsolidation(graph([target, source], links));

    expect(rollup.target.id).toBe("doc0_sec_5");
    expect(rollup.incoming[0].source.id).toBe("doc1_a");
  });
});

describe("buildAmendmentLedger", () => {
  it("keeps only amendments that reach into another document", () => {
    const nodes = [
      node("doc0_sec_4", "doc0", "EU 1224/2009 Art. 4"),
      node("doc1_sec_9", "doc1", "EU 2023/2842 Art. 9"),
      node("doc1_a", "doc1", "EU 2023/2842 Art. 1"),
    ];
    const links = [
      // The amending act changing the amended act: an entry.
      link("doc1_a", "doc0_sec_4", { amends: true, isCrossDoc: true, snippet: "Artikel 4 ændres" }),
      // The amending act restating its own instruction text: not an entry.
      link("doc1_a", "doc1_sec_9", { amends: true }),
      // A plain reference across documents: not an amendment.
      link("doc1_a", "doc0_sec_4", { isCrossDoc: true }),
    ];

    const ledger = buildAmendmentLedger(graph(nodes, links));

    expect(ledger).toHaveLength(1);
    expect(ledger[0].source.id).toBe("doc1_a");
    expect(ledger[0].target.id).toBe("doc0_sec_4");
  });

  it("excludes amendments pointing at unresolved external references", () => {
    const nodes = [
      node("doc1_a", "doc1", "EU 2023/2842 Art. 1"),
      node("external_doc0_sec_900", "doc0", "Ekstern henvisning 900", {
        external: true,
        is_subnode: true,
      }),
    ];
    const links = [link("doc1_a", "external_doc0_sec_900", { amends: true, isCrossDoc: true })];

    expect(buildAmendmentLedger(graph(nodes, links))).toHaveLength(0);
  });
});
