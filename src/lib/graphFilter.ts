import type { GraphNode, GraphLink } from "@/app/page";

// D3 mutates link.source/link.target from a plain string id into the resolved node object
// in place once a simulation runs, so any code reading a link's endpoint id must handle both
// shapes. Centralized here since every graph view needs to do this the same way.
export function linkEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

export function filterGraph(
  nodes: GraphNode[],
  links: GraphLink[],
  activeDocFilter: "all" | "control" | "impl",
  activeCategoryFilter: string,
  searchQuery: string
): { filteredNodes: GraphNode[]; filteredLinks: GraphLink[] } {
  const filteredNodes = nodes.filter(n => {
    if (activeDocFilter !== "all" && n.doc !== activeDocFilter) return false;
    if (activeCategoryFilter !== "all" && n.theme !== activeCategoryFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return n.label.toLowerCase().includes(query) ||
             n.title.toLowerCase().includes(query) ||
             n.body.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = links.filter(l => {
    return filteredNodeIds.has(linkEndpointId(l.source)) && filteredNodeIds.has(linkEndpointId(l.target));
  });

  return { filteredNodes, filteredLinks };
}

export function computeDegree(links: GraphLink[]): Record<string, number> {
  const degree: Record<string, number> = {};
  for (const l of links) {
    const s = linkEndpointId(l.source);
    const t = linkEndpointId(l.target);
    degree[s] = (degree[s] || 0) + 1;
    degree[t] = (degree[t] || 0) + 1;
  }
  return degree;
}
