import * as d3 from "d3";
import type {
  GraphNode as ParsedNode,
  GraphLink as ParsedLink,
  OverlapRecord,
  ConflictRecord,
  ParseResult,
} from "./parser";
import { DocRef } from "./docDisplay";

export type { DocRef, OverlapRecord, ConflictRecord, ParseResult };

/**
 * The client node is the parser's node plus the mutable layout fields d3-force writes onto
 * it in place (x, y, vx, vy, fx, fy, index). The shape itself is declared once, in
 * parser.ts, next to the code that produces it, so the two cannot drift.
 */
export interface GraphNode extends ParsedNode, d3.SimulationNodeDatum {}

/**
 * Same for links, with one widening: the parser emits string endpoints, and d3 replaces
 * them with node references in place once the simulation is initialised, so a link that has
 * been through a simulation carries either.
 */
export interface GraphLink
  extends Omit<ParsedLink, "source" | "target">,
    d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

/**
 * The client view of a ParseResult: identical records, d3-augmented nodes and links. Any
 * field added to the server response reaches the client types automatically.
 */
export interface GraphData extends Omit<ParseResult, "nodes" | "links"> {
  nodes: GraphNode[];
  links: GraphLink[];
}
