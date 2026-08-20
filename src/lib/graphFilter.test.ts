import { describe, it, expect } from "vitest";
import { filterGraph, computeDegree } from "./graphFilter";
import type { GraphNode, GraphLink } from "@/app/page";

function node(id: string, doc: string): GraphNode {
  return { id, number: 1, label: id, title: "", doc, theme: "General", body: "" };
}

function link(source: string, target: string): GraphLink {
  return { source, target, type: "citation", modality: "Obligation", snippet: "", context: "" };
}

describe("filterGraph with 3+ documents", () => {
  const nodes = [node("doc0_sec_1", "doc0"), node("doc1_sec_1", "doc1"), node("doc2_sec_1", "doc2")];
  const links = [link("doc0_sec_1", "doc1_sec_1"), link("doc1_sec_1", "doc2_sec_1")];

  it("keeps only nodes/links for the selected doc id, for an arbitrary (non A/B) doc id", () => {
    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, "doc2", "all", "");
    expect(filteredNodes.map(n => n.id)).toEqual(["doc2_sec_1"]);
    expect(filteredLinks).toHaveLength(0);
  });

  it("keeps all nodes when activeDocFilter is 'all'", () => {
    const { filteredNodes } = filterGraph(nodes, links, "all", "all", "");
    expect(filteredNodes).toHaveLength(3);
  });

  it("filters nodes based on fleetCriteria", () => {
    const fleetNodes: GraphNode[] = [
      { id: "n1", number: 1, label: "Art 1", title: "12 meter krav", doc: "doc0", theme: "General", body: "Fartøjer med en længde overalt på 12 meter eller derover skal føre logbog" },
      { id: "n2", number: 2, label: "Art 2", title: "Kystfiskeri", doc: "doc1", theme: "General", body: "Gælder for kystnære fartøjer under 8 meter i Nordsøen med garn" }
    ];
    const fleetLinks: GraphLink[] = [link("n1", "n2")];

    const result = filterGraph(fleetNodes, fleetLinks, "all", "all", "", {
      vesselLength: "12_18m",
      gearType: "all",
      seaArea: "all"
    });

    expect(result.filteredNodes.map(n => n.id)).toEqual(["n1"]);
    expect(result.filteredLinks).toHaveLength(0);
  });
});

describe("computeDegree", () => {
  it("counts both endpoints across an arbitrary number of documents", () => {
    const links = [link("doc0_sec_1", "doc1_sec_1"), link("doc1_sec_1", "doc2_sec_1")];
    const degree = computeDegree(links);
    expect(degree["doc1_sec_1"]).toBe(2);
    expect(degree["doc0_sec_1"]).toBe(1);
    expect(degree["doc2_sec_1"]).toBe(1);
  });
});
