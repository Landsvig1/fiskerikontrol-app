import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { GraphNode, GraphLink, GraphData } from "@/app/page";

import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { MODALITY_LEGEND, modalityColor, modalityBadgeClasses } from "@/lib/graphColors";
import { filterGraph, computeDegree } from "@/lib/graphFilter";
import { docLabel, docColorFor } from "@/lib/docDisplay";

interface CitationGraphViewProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | string;
  activeCategoryFilter: string;
  searchQuery: string;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
}

export function CitationGraphView({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  setSelectedNode,
  t
}: CitationGraphViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b13] relative border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
      <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none">
        <div className="bg-[#0f172a]/90 backdrop-blur-sm p-4 rounded-xl border border-[#1e293b] pointer-events-auto shadow-xl">
          <h3 className="text-sm font-bold text-[#f8fafc] mb-2 uppercase tracking-wider">{t("citationGraph")}</h3>
          <div className="space-y-2 text-xs text-[#94a3b8]">
            {data.docs.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: docColorFor(data.docs, d.id) }}></div>
                {docLabel(data.docs, d.id, t)}
              </div>
            ))}
            <div className="border-t border-[#1e293b] pt-2 mt-2">
              {MODALITY_LEGEND.map(({ modality, color, dashed }) => (
                <div key={modality} className="flex items-center gap-2 mt-1 first:mt-0">
                  <div className={`w-4 h-0.5 ${dashed ? "border-dashed border-t" : ""}`} style={{ backgroundColor: dashed ? undefined : color, borderColor: dashed ? color : undefined }}></div>
                  {t(modality.toLowerCase() as TranslationKey)}
                </div>
              ))}
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
          t={t}
        />
      </div>

      {/* Details sidebar drawer — full-width overlay on small screens, fixed w-96 on sm+ */}
      {selectedNode && (
        <div className="absolute right-0 top-0 w-full sm:w-96 max-w-full bg-[#0d1527] border-l border-[#1e293b] flex flex-col h-full z-20 shadow-2xl transition-all duration-300">
          <div className="p-6 border-b border-[#1e293b] relative flex flex-col gap-2">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#f8fafc] text-xl"
            >
              &times;
            </button>
            <span
              className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
              style={{
                backgroundColor: `${docColorFor(data.docs, selectedNode.doc)}1a`,
                color: docColorFor(data.docs, selectedNode.doc),
                borderColor: `${docColorFor(data.docs, selectedNode.doc)}4d`,
              }}
            >
              {docLabel(data.docs, selectedNode.doc, t)}
            </span>
            <h2 className="text-lg font-bold">{selectedNode.label}</h2>
            <p className="text-xs text-[#94a3b8] font-medium">{selectedNode.title || t("noTitle")}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">{t("category")}</h3>
              <span className="inline-block px-2.5 py-1 rounded bg-[#1e293b] text-xs font-semibold text-[#f8fafc]">
                {selectedNode.theme}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">{t("documentText")}</h3>
              <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-lg text-sm leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedNode.body}
              </div>
            </div>

            {/* List connections */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">{t("connections")}</h3>
              <div className="space-y-2">
                {data.links.filter(l => {
                  const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                  const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
                  return s === selectedNode.id || t === selectedNode.id;
                }).map((l, i) => {
                  const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                  const targetNodeId = sId === selectedNode.id 
                    ? (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target)
                    : sId;
                  
                  const targetNode = data.nodes.find(n => n.id === targetNodeId);
                  if (!targetNode) return null;

                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedNode(targetNode)}
                      className="p-3 bg-[#070b13] border border-[#1e293b] rounded-lg hover:border-[#38bdf8]/40 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#38bdf8]">{targetNode.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${modalityBadgeClasses(l.modality)}`}>
                          {t(l.modality.toLowerCase() as TranslationKey)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] truncate mt-1">{targetNode.title || t("noHeading")}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
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
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);

  const top10Nodes = useMemo(() => {
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, activeDocFilter, activeCategoryFilter, searchQuery);
    const degree = computeDegree(filteredLinks);

    return filteredNodes
      .map(n => ({ ...n, degree: degree[n.id] || 0 }))
      .sort((a, b) => (b.degree || 0) - (a.degree || 0))
      .slice(0, 10);
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery]);

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
    zoomBehaviorRef.current = zoom;

    // Initial Zoom
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, activeDocFilter, activeCategoryFilter, searchQuery);
    const degree = computeDegree(filteredLinks);

    const padding = 60;
    const nodeHeightSpacing = 25;
    const numDocs = data.docs.length;

    const nodesByDoc = d3.group(filteredNodes, n => n.doc);
    data.docs.forEach((docRef, docIndex) => {
      const x = width * (docIndex + 1) / (numDocs + 1);
      (nodesByDoc.get(docRef.id) ?? [])
        .sort((a, b) => a.number - b.number)
        .forEach((n, i) => {
          n.x = x;
          n.y = padding + i * nodeHeightSpacing;
        });
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
      .attr("stroke", d => modalityColor(d.modality))
      .attr("stroke-opacity", 0)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none");

    // Fade links in smoothly on (re)draw, e.g. when filters change, rather than popping in instantly.
    link.transition().duration(300).attr("stroke-opacity", 0.4);

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
      .attr("fill", d => docColorFor(data.docs, d.doc))
      .attr("stroke", "#0d1527")
      .attr("stroke-width", 1.5);

    // Docs in the left half of the column order label to the left (anchor-end), the right
    // half label to the right (anchor-start) — the natural N-way generalization of the old
    // binary control=left/impl=right split. Odd numDocs: the middle column labels right.
    const docIndexOf = new Map(data.docs.map((d, i) => [d.id, i]));
    const isLeftHalf = (docId: string) => (docIndexOf.get(docId) ?? 0) < numDocs / 2;

    node.append("text")
      .text(d => d.label)
      .attr("x", d => isLeftHalf(d.doc) ? -15 : 15)
      .attr("y", 4)
      .attr("text-anchor", d => isLeftHalf(d.doc) ? "end" : "start")
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

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1 / 1.3);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, initialTransform);
  };

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const gNodes = d3.select(svgRef.current).selectAll<SVGGElement, GraphNode>("g.node");
    let targetNode: GraphNode | undefined;
    gNodes.each(function(d) {
      if (d.id === nodeId) {
        targetNode = d;
      }
    });
    if (!targetNode || targetNode.x === undefined || targetNode.y === undefined) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    setSelectedNode(targetNode);
    
    const targetScale = 1.5;
    const transform = d3.zoomIdentity
      .translate(width / 2 - targetNode.x * targetScale, height / 2 - targetNode.y * targetScale)
      .scale(targetScale);

    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, transform);
  };

  return (
    <div className="w-full h-full relative overflow-hidden" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full block" style={{ outline: 'none' }} />

      {/* Zoom HUD Controls & Important Articles */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10 select-none">
        <div className="flex flex-col gap-2 bg-[#0d1527]/90 border border-[#1e293b] p-2 rounded-xl backdrop-blur-md shadow-lg">
          <button 
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-sm font-bold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
            title="Zoom ind"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-sm font-bold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
            title="Zoom ud"
          >
            &minus;
          </button>
          <button 
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#94a3b8] hover:text-[#38bdf8]"
            title="Nulstil zoom"
          >
            Reset
          </button>
        </div>

        {/* Top 10 nodes */}
        {top10Nodes.length > 0 && (
          <div className="flex flex-col gap-2 bg-[#0d1527]/90 border border-[#1e293b] p-2 rounded-xl backdrop-blur-md shadow-lg max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] text-center mb-1">
              Top 10
            </div>
            {top10Nodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleFocusNode(node.id)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border text-center ${
                  selectedNode?.id === node.id 
                    ? "bg-[#38bdf8] text-[#070b13] border-[#38bdf8]" 
                    : "bg-[#1e293b] hover:bg-[#334155] border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
                }`}
                title={`Art. ${node.number}: ${node.title} (${node.degree} links)`}
              >
                {node.number}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
