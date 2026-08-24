import { describe, it, expect } from "vitest";
import { buildNodeConnections, groupNodeConnections, findConflictBetween } from "./nodeConnections";
import type { ConflictRecord, GraphLink, GraphNode } from "./types";

function node(id: string, doc: string, label: string): GraphNode {
  return { id, doc, label, number: 1, title: "", body: "", theme: "" };
}

function link(source: string, target: string, modality: GraphLink["modality"]): GraphLink {
  return { source, target, type: "citation", modality, snippet: "", context: "" };
}

const selected = node("doc0_sec_9", "doc0", "Art. 9");
const sameDoc = node("doc0_sec_10", "doc0", "Art. 10");
const otherDoc = node("doc1_sec_3", "doc1", "§ 3");
const otherDoc2 = node("doc1_sec_4", "doc1", "§ 4");
const nodes = [selected, sameDoc, otherDoc, otherDoc2];

const conflict: ConflictRecord = {
  target: "doc0_sec_9",
  modalities: ["Obligation", "Exception"],
  description: "",
  citations: [{ source: "doc1_sec_3", modality: "Exception", snippet: "", context: "" }],
};

describe("buildNodeConnections", () => {
  it("returns both directions and marks which is which", () => {
    const links = [link(selected.id, sameDoc.id, "Obligation"), link(otherDoc.id, selected.id, "Exception")];
    const result = buildNodeConnections(selected, nodes, links, []);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ isOutgoing: true, otherNode: sameDoc });
    expect(result[1]).toMatchObject({ isOutgoing: false, otherNode: otherDoc });
  });

  it("ignores links that do not touch the selected node", () => {
    const links = [link(sameDoc.id, otherDoc.id, "Obligation")];
    expect(buildNodeConnections(selected, nodes, links, [])).toEqual([]);
  });

  it("drops a link whose other endpoint is not in the given node set", () => {
    // This is what filtering out a node must do: the connection goes with it, rather than
    // offering a switch-focus action that selects a node the canvas never drew.
    const links = [link(selected.id, "doc9_sec_1", "Obligation")];
    expect(buildNodeConnections(selected, nodes, links, [])).toEqual([]);
  });

  it("resolves endpoints that d3 has replaced with node objects", () => {
    const resolved: GraphLink = { ...link("", "", "Obligation"), source: selected, target: otherDoc };
    const result = buildNodeConnections(selected, nodes, [resolved], []);
    expect(result[0].otherNode).toBe(otherDoc);
    expect(result[0].isOutgoing).toBe(true);
  });

  it("marks cross-document connections", () => {
    const links = [link(selected.id, sameDoc.id, "Obligation"), link(selected.id, otherDoc.id, "Obligation")];
    const result = buildNodeConnections(selected, nodes, links, []);
    expect(result.map((c) => c.isCrossDoc)).toEqual([false, true]);
  });

  it("marks a connection that a conflict record runs across", () => {
    const links = [link(otherDoc.id, selected.id, "Exception"), link(selected.id, sameDoc.id, "Obligation")];
    const result = buildNodeConnections(selected, nodes, links, [conflict]);
    expect(result.find((c) => c.otherNode === otherDoc)?.isConflict).toBe(true);
    expect(result.find((c) => c.otherNode === sameDoc)?.isConflict).toBe(false);
  });

  it("returns nothing when no node is selected", () => {
    expect(buildNodeConnections(null, nodes, [link("a", "b", "Obligation")], [])).toEqual([]);
  });
});

describe("groupNodeConnections", () => {
  it("puts conflicts first regardless of direction, then outgoing, then incoming", () => {
    const links = [
      link(selected.id, sameDoc.id, "Obligation"),
      link(otherDoc2.id, selected.id, "Obligation"),
      link(otherDoc.id, selected.id, "Exception"),
    ];
    const groups = groupNodeConnections(buildNodeConnections(selected, nodes, links, [conflict]));

    expect(groups.map((g) => g.key)).toEqual(["conflict", "outgoing", "incoming"]);
    expect(groups[0].items.map((c) => c.otherNode.id)).toEqual([otherDoc.id]);
    expect(groups[1].items.map((c) => c.otherNode.id)).toEqual([sameDoc.id]);
    expect(groups[2].items.map((c) => c.otherNode.id)).toEqual([otherDoc2.id]);
  });

  it("omits empty groups", () => {
    const links = [link(selected.id, sameDoc.id, "Obligation")];
    const groups = groupNodeConnections(buildNodeConnections(selected, nodes, links, []));
    expect(groups.map((g) => g.key)).toEqual(["outgoing"]);
  });

  it("sorts cross-document connections above same-document ones", () => {
    const links = [link(selected.id, sameDoc.id, "Obligation"), link(selected.id, otherDoc.id, "Obligation")];
    const groups = groupNodeConnections(buildNodeConnections(selected, nodes, links, []));
    expect(groups[0].items.map((c) => c.otherNode.id)).toEqual([otherDoc.id, sameDoc.id]);
  });

  it("ranks a derogation above a plain permission within a group", () => {
    const links = [link(selected.id, otherDoc2.id, "Permission"), link(selected.id, otherDoc.id, "Exception")];
    const groups = groupNodeConnections(buildNodeConnections(selected, nodes, links, []));
    expect(groups[0].items.map((c) => c.link.modality)).toEqual(["Exception", "Permission"]);
  });

  it("falls back to the label for a stable order within one modality", () => {
    const links = [link(selected.id, otherDoc2.id, "Obligation"), link(selected.id, otherDoc.id, "Obligation")];
    const groups = groupNodeConnections(buildNodeConnections(selected, nodes, links, []));
    expect(groups[0].items.map((c) => c.otherNode.label)).toEqual(["§ 3", "§ 4"]);
  });

  it("returns no groups for a node with no connections", () => {
    expect(groupNodeConnections([])).toEqual([]);
  });
});

describe("findConflictBetween", () => {
  it("matches in either direction", () => {
    expect(findConflictBetween([conflict], selected, otherDoc)).toBe(conflict);
    expect(findConflictBetween([conflict], otherDoc, selected)).toBe(conflict);
  });

  it("does not match an unrelated pair", () => {
    expect(findConflictBetween([conflict], selected, sameDoc)).toBeUndefined();
  });

  it("also matches records keyed by label rather than id", () => {
    const byLabel: ConflictRecord = {
      ...conflict,
      target: "Art. 9",
      citations: [{ source: "§ 3", modality: "Exception", snippet: "", context: "" }],
    };
    expect(findConflictBetween([byLabel], selected, otherDoc)).toBe(byLabel);
  });
});
