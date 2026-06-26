import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphNode, GraphLink, GraphData } from "@/app/page";

interface CitationGraphViewProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | "control" | "impl";
  activeCategoryFilter: string;
  searchQuery: string;
  setSelectedNode: (node: GraphNode | null) => void;
}

export function CitationGraphView({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  setSelectedNode
}: CitationGraphViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b13] relative border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
      <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none">
        <div className="bg-[#0f172a]/90 backdrop-blur-sm p-4 rounded-xl border border-[#1e293b] pointer-events-auto shadow-xl">
          <h3 className="text-sm font-bold text-[#f8fafc] mb-2 uppercase tracking-wider">Citation Graph</h3>
          <div className="space-y-2 text-xs text-[#94a3b8]">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Ramme (1224/2009)</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Regler (2025/2196)</div>
            <div className="border-t border-[#1e293b] pt-2 mt-2">
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3b82f6]"></div> Forpligtelse</div>
              <div className="flex items-center gap-2 mt-1"><div className="w-4 h-0.5 bg-[#ef4444] border-dashed border-t border-[#ef4444]"></div> Undtagelse</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#0a1122]">
        <CitationGraphCanvas 
          data={data}
          selectedNode={selectedNode}
          activeDocFilter={activeDocFilter}
          activeCategoryFilter={activeCategoryFilter}
          searchQuery={searchQuery}
          setSelectedNode={setSelectedNode}
        />
      </div>
    </div>
  );
}

function CitationGraphCanvas({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  setSelectedNode
}: CitationGraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (selectedNode) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNode.id);

      svg.selectAll("path.citation-link").style("stroke-opacity", (d: unknown) => {
        const l = d as GraphLink;
        const sId = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
        if (sId === selectedNode.id || tId === selectedNode.id) {
          connectedNodeIds.add(sId);
          connectedNodeIds.add(tId);
          return 1.0;
        }
        return 0.08;
      });

      svg.selectAll("g.node")
        .style("opacity", (d: unknown) => {
          const n = d as GraphNode;
          return connectedNodeIds.has(n.id) ? 1.0 : 0.15;
        });

      svg.selectAll("circle")
        .attr("stroke-width", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? 3.0 : 1.5;
        })
        .attr("stroke", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? "#38bdf8" : "#0d1527";
        });
    } else {
      svg.selectAll("path.citation-link").style("stroke-opacity", 0.4);
      svg.selectAll("g.node").style("opacity", 1.0);
      svg.selectAll("circle")
        .attr("stroke-width", 1.5)
        .attr("stroke", "#0d1527");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Initial Zoom
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

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
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });

    const degree: Record<string, number> = {};
    filteredLinks.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree[s] = (degree[s] || 0) + 1;
      degree[t] = (degree[t] || 0) + 1;
    });

    const controlNodes = filteredNodes.filter(n => n.doc === "control").sort((a, b) => a.number - b.number);
    const implNodes = filteredNodes.filter(n => n.doc === "impl").sort((a, b) => a.number - b.number);

    const padding = 60;
    const nodeHeightSpacing = 25;
    
    controlNodes.forEach((n, i) => {
      n.x = width * 0.25;
      n.y = padding + i * nodeHeightSpacing;
    });

    implNodes.forEach((n, i) => {
      n.x = width * 0.75;
      n.y = padding + i * nodeHeightSpacing;
    });

    const nodeMap = new Map<string, GraphNode>();
    filteredNodes.forEach(n => nodeMap.set(n.id, n));

    const resolvedLinks = filteredLinks.map(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        ...l,
        source: nodeMap.get(sourceId) as GraphNode,
        target: nodeMap.get(targetId) as GraphNode
      };
    }).filter(l => l.source && l.target);

    const link = g.append("g")
      .selectAll("path.citation-link")
      .data(resolvedLinks)
      .join("path")
      .attr("class", "citation-link")
      .attr("d", d => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        if (s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) return "";
        const cpOffset = Math.max(100, Math.abs(t.x - s.x) * 0.5);
        return `M${s.x},${s.y} C${s.x + cpOffset},${s.y} ${t.x - cpOffset},${t.y} ${t.x},${t.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", d => {
        if (d.modality === "Exception") return "#ef4444";
        if (d.modality === "Prohibition") return "#ec4899";
        if (d.modality === "Permission") return "#10b981";
        return "#3b82f6";
      })
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none");

    const node = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(filteredNodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
      .style("cursor", "pointer");

    node.append("circle")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18);
      })
      .attr("fill", d => d.doc === "control" ? "#3b82f6" : "#10b981")
      .attr("stroke", "#0d1527")
      .attr("stroke-width", 1.5);
      
    node.append("text")
      .text(d => d.label)
      .attr("x", d => d.doc === "control" ? -15 : 15)
      .attr("y", 4)
      .attr("text-anchor", d => d.doc === "control" ? "end" : "start")
      .attr("fill", "#94a3b8")
      .attr("font-size", "11px")
      .attr("font-weight", "500");

    node.on("click", (event, d) => {
      setSelectedNode(d);
    });

    node.on("mouseover", (event, d) => {
      if (selectedNodeRef.current) return;
      
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(d.id);

      link.style("stroke-opacity", l => {
        const sId = (l.source as GraphNode).id;
        const tId = (l.target as GraphNode).id;
        if (sId === d.id) {
          connectedNodeIds.add(tId);
          return 1.0;
        }
        if (tId === d.id) {
          connectedNodeIds.add(sId);
          return 1.0;
        }
        return 0.05;
      });

      node.style("opacity", n => connectedNodeIds.has(n.id) ? 1.0 : 0.15);
    });

    node.on("mouseout", () => {
      if (selectedNodeRef.current) return;
      link.style("stroke-opacity", 0.4);
      node.style("opacity", 1.0);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery, setSelectedNode]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full" style={{ outline: 'none' }} />
    </div>
  );
}
