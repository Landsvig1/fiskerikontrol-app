import { ConflictRecord, GraphLink, GraphNode } from "./types";
import { Modality } from "./graphColors";

export interface NodeConnection {
  link: GraphLink;
  isOutgoing: boolean;
  otherNode: GraphNode;
  isConflict: boolean;
  isCrossDoc: boolean;
}

export type ConnectionGroupKey = "conflict" | "outgoing" | "incoming";

export interface ConnectionGroup {
  key: ConnectionGroupKey;
  items: NodeConnection[];
}

function endpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

/**
 * Whether a recorded conflict runs between these two specific provisions, in either
 * direction. Conflict records key on node ids, but older fixtures and hand-built records
 * key on labels, so both are accepted.
 *
 * Shared with the connection explainer so the group a connection is filed under and the
 * conflict warning printed on its card are decided by one rule.
 */
export function findConflictBetween(
  conflicts: ConflictRecord[],
  selectedNode: Pick<GraphNode, "id" | "label">,
  otherNode: Pick<GraphNode, "id" | "label">
): ConflictRecord | undefined {
  return conflicts.find((c) => {
    const targetsSelected = c.target === selectedNode.id || c.target === selectedNode.label;
    const targetsOther = c.target === otherNode.id || c.target === otherNode.label;
    const sourcesContainSelected = c.citations.some(
      (cit) => cit.source === selectedNode.id || cit.source === selectedNode.label
    );
    const sourcesContainOther = c.citations.some(
      (cit) => cit.source === otherNode.id || cit.source === otherNode.label
    );
    return (targetsSelected && sourcesContainOther) || (targetsOther && sourcesContainSelected);
  });
}

// What a control officer is hunting, in order. A derogation from a binding rule is the
// finding that changes an inspection; a plain permission rarely is.
const MODALITY_RANK: Record<Modality, number> = {
  Exception: 0,
  Prohibition: 1,
  Obligation: 2,
  Permission: 3,
};

function rank(connection: NodeConnection): [number, number, string] {
  return [
    connection.isCrossDoc ? 0 : 1,
    MODALITY_RANK[connection.link.modality] ?? 4,
    connection.otherNode.label,
  ];
}

function bySalience(a: NodeConnection, b: NodeConnection): number {
  const [ax, ay, az] = rank(a);
  const [bx, by, bz] = rank(b);
  return ax - bx || ay - by || az.localeCompare(bz);
}

/**
 * Every connection the selected node has within the given node and link set.
 *
 * Callers must pass the same filtered subgraph the canvas draws, not the raw parse result.
 * Passing the full set lists citations to sections that are not on screen and offers a
 * "switch focus" action that selects a node the canvas cannot centre.
 */
export function buildNodeConnections(
  selectedNode: GraphNode | null,
  nodes: GraphNode[],
  links: GraphLink[],
  conflicts: ConflictRecord[]
): NodeConnection[] {
  if (!selectedNode) return [];

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return links.flatMap((link) => {
    const sourceId = endpointId(link.source);
    const targetId = endpointId(link.target);
    if (sourceId !== selectedNode.id && targetId !== selectedNode.id) return [];

    const isOutgoing = sourceId === selectedNode.id;
    const otherNode = nodeById.get(isOutgoing ? targetId : sourceId);
    if (!otherNode) return [];

    return [{
      link,
      isOutgoing,
      otherNode,
      isConflict: Boolean(findConflictBetween(conflicts, selectedNode, otherNode)),
      isCrossDoc: otherNode.doc !== selectedNode.doc,
    }];
  });
}

/**
 * Splits connections into the three groups the drawer renders, each sorted by salience.
 * A conflicting connection is filed under "conflict" regardless of its direction: which
 * side cited which matters less than the fact that the two provisions contradict.
 * Empty groups are omitted so the drawer does not render an empty heading.
 */
export function groupNodeConnections(connections: NodeConnection[]): ConnectionGroup[] {
  const conflict = connections.filter((c) => c.isConflict).sort(bySalience);
  const outgoing = connections.filter((c) => !c.isConflict && c.isOutgoing).sort(bySalience);
  const incoming = connections.filter((c) => !c.isConflict && !c.isOutgoing).sort(bySalience);

  return ([
    { key: "conflict", items: conflict },
    { key: "outgoing", items: outgoing },
    { key: "incoming", items: incoming },
  ] as ConnectionGroup[]).filter((group) => group.items.length > 0);
}
