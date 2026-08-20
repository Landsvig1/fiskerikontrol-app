import * as d3 from "d3";
import { Modality } from "./graphColors";
import { DocRef } from "./docDisplay";

export type { DocRef };

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;           // format: {docId}_sec_{n}  e.g. "doc0_sec_12"
  number: number;
  label: string;
  title: string;
  doc: string;           // docId
  theme: string;
  body: string;
  is_subnode?: boolean;
  parent_id?: string;
  external?: boolean;   // true for virtual subnodes that reference unknown sections
  isCrossDoc?: boolean;
  citationsCount?: number;
  // d3 position properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  targetLabel?: string;
  rawMatch?: string;
  modality: Modality;
  snippet?: string;
  context?: string;
  isCrossDoc?: boolean;
}

export interface OverlapRecord {
  target: string;
  sources: string[];
  count: number;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
  }>;
}

export interface ConflictRecord {
  target: string;
  modalities: string[];
  description: string;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
    context: string;
  }>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  overlaps: OverlapRecord[];
  conflicts: ConflictRecord[];
  docs: DocRef[];
}
