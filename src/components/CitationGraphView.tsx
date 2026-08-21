"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { GraphNode, GraphLink, GraphData } from "@/lib/types";
import { FleetFilterCriteria, matchesFleetCriteria } from "@/lib/fleetFilter";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { MODALITY_LEGEND, modalityColor, modalityBadgeClasses } from "@/lib/graphColors";
import { filterGraph, computeDegree } from "@/lib/graphFilter";
import { docLabel, docColorFor, docBadgeStyle } from "@/lib/docDisplay";
import { 
  Filter, 
  GitBranch, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  X,
} from "lucide-react";

interface CitationGraphViewProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | string;
  activeCategoryFilter: string;
  searchQuery: string;
  fleetCriteria?: FleetFilterCriteria;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
  lang?: "da" | "en";
}

export function CitationGraphView({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  fleetCriteria,
  setSelectedNode,
  t,
  lang = "da",
}: CitationGraphViewProps) {
  const isFleetFiltered = fleetCriteria && (
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all"
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fafaf9] relative border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200 pointer-events-auto shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t("citationGraph")}</h3>
            {isFleetFiltered && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                <Filter className="w-2.5 h-2.5" />
                {lang === "da" ? "Flådefiltreret" : "Fleet Filtered"}
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            {data.docs.map(d => (
              <div key={d.id} className="flex items-center gap-2 font-medium">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: docColorFor(data.docs, d.id) }}></div>
                {docLabel(data.docs, d.id, t)}
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 mt-2">
              {MODALITY_LEGEND.map(({ modality, color, dashed }) => (
                <div key={modality} className="flex items-center gap-2 mt-1 first:mt-0 font-medium">
                  <div className={`w-3.5 h-0.5 ${dashed ? "border-dashed border-t" : ""}`} style={{ backgroundColor: dashed ? undefined : color, borderColor: dashed ? color : undefined }}></div>
                  {t(modality.toLowerCase() as TranslationKey)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#f8fafc]">
        <CitationGraphCanvas 
          data={data}
          selectedNode={selectedNode}
          activeDocFilter={activeDocFilter}
          activeCategoryFilter={activeCategoryFilter}
          searchQuery={searchQuery}
          fleetCriteria={fleetCriteria}
          setSelectedNode={setSelectedNode}
          t={t}
          lang={lang}
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
  fleetCriteria,
  setSelectedNode,
  t
}: CitationGraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);

  const isFleetFiltered = fleetCriteria && (
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all"
  );

  const conflictTargets = useMemo(() => {
    return new Set(
      data.conflicts
        .filter(c => {
          const tNode = data.nodes.find(n => n.id === c.target);
          return tNode && !tNode.external && !tNode.id.startsWith("external_");
        })
        .map(c => c.target)
    );
  }, [data.conflicts, data.nodes]);

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

  const prevSelectedNodeRef = useRef<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const wasSelected = prevSelectedNodeRef.current;
    prevSelectedNodeRef.current = selectedNode;

    if (selectedNode) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNode.id);

      // Identify all directly connected links and direction
      const nodeDirections = new Map<string, "outgoing" | "incoming">();

      svg.selectAll<SVGPathElement, GraphLink>("path.citation-link").each(function(l) {
        const sId = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
        if (sId === selectedNode.id) {
          connectedNodeIds.add(tId);
          nodeDirections.set(tId, "outgoing");
        } else if (tId === selectedNode.id) {
          connectedNodeIds.add(sId);
          nodeDirections.set(sId, "incoming");
        }
      });

      // Completely hide all unconnected links
      svg.selectAll<SVGPathElement, GraphLink>("path.citation-link")
        .style("display", (l) => {
          const sId = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
          const tId = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
          return (sId === selectedNode.id || tId === selectedNode.id) ? "inline" : "none";
        })
        .style("stroke-opacity", 1.0)
        .attr("stroke-width", 3.0)
        .attr("marker-end", (l) => `url(#arrow-${l.modality.toLowerCase()})`);

      // Completely hide all unconnected nodes, display only connected nodes
      svg.selectAll<SVGGElement, GraphNode>("g.node")
        .style("display", (n) => connectedNodeIds.has(n.id) ? "inline" : "none")
        .style("opacity", 1.0);

      // Show crisp, informative contextual labels on the selected node and connected neighbors
      svg.selectAll<SVGTextElement, GraphNode>("g.node text")
        .text((n) => {
          if (!connectedNodeIds.has(n.id)) return "";
          if (n.id === selectedNode.id) {
            return `★ ${n.label} (Valgt)`;
          }
          const dir = nodeDirections.get(n.id);
          const prefix = dir === "outgoing" ? "→ Refererer til: " : "← Citeret af: ";
          const titleSnippet = n.title ? ` (${n.title.slice(0, 32)}${n.title.length > 32 ? '...' : ''})` : '';
          return `${prefix}${n.label}${titleSnippet}`;
        })
        .style("opacity", 1.0)
        .style("font-size", (n) => n.id === selectedNode.id ? "12px" : "11px")
        .style("font-weight", (n) => n.id === selectedNode.id ? "800" : "700")
        .attr("fill", (n) => n.id === selectedNode.id ? "#0284c7" : "#0f172a");

      // Selected node focal ring
      svg.selectAll<SVGCircleElement, GraphNode>("circle.primary-circle")
        .attr("stroke-width", (n) => n.id === selectedNode.id ? 4.0 : 2.5)
        .attr("stroke", (n) => n.id === selectedNode.id ? "#0284c7" : "#ffffff");

      // Hide halos for unconnected nodes
      svg.selectAll<SVGCircleElement, GraphNode>("circle.conflict-halo")
        .style("display", (n) => connectedNodeIds.has(n.id) ? "inline" : "none")
        .style("opacity", 1.0);

      // Frame the entire connected subgraph (selected node + all connected neighbors) into the viewport
      if (zoomBehaviorRef.current) {
        const connectedNodesList: GraphNode[] = [];
        svg.selectAll<SVGGElement, GraphNode>("g.node").each(function(d) {
          if (connectedNodeIds.has(d.id)) {
            connectedNodesList.push(d);
          }
        });

        if (connectedNodesList.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const n of connectedNodesList) {
            if (n.x === undefined || n.y === undefined) continue;
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
          }

          const width = containerRef.current.clientWidth || 800;
          const height = containerRef.current.clientHeight || 600;
          const padX = 220;
          const padY = 160;
          const clusterWidth = Math.max(maxX - minX + padX * 2, 280);
          const clusterHeight = Math.max(maxY - minY + padY * 2, 240);

          const scaleX = width / clusterWidth;
          const scaleY = height / clusterHeight;
          const fitScale = Math.max(0.65, Math.min(scaleX, scaleY, 1.35));

          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;

          const tx = width / 2 - midX * fitScale;
          const ty = height / 2 - midY * fitScale;

          svg.transition()
            .duration(500)
            .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(fitScale));
        }
      }
    } else {
      // Reset styling when no node is selected: restore all nodes and links
      svg.selectAll<SVGPathElement, GraphLink>("path.citation-link")
        .style("display", "inline")
        .style("stroke-opacity", 0.5)
        .attr("stroke-width", 1.8)
        .attr("marker-end", (d) => `url(#arrow-${d.modality.toLowerCase()})`);

      svg.selectAll<SVGGElement, GraphNode>("g.node")
        .style("display", "inline")
        .style("opacity", (d: unknown) => {
          const n = d as GraphNode;
          if (isFleetFiltered) {
            return matchesFleetCriteria(n, fleetCriteria!) ? 1.0 : 0.2;
          }
          return 1.0;
        });

      svg.selectAll<SVGTextElement, GraphNode>("g.node text")
        .text((n) => n.label)
        .style("opacity", 1.0)
        .style("font-size", "11px")
        .style("font-weight", "600")
        .attr("fill", "#475569");

      svg.selectAll<SVGCircleElement, GraphNode>("circle.primary-circle")
        .attr("stroke-width", 1.5)
        .attr("stroke", "#ffffff");

      svg.selectAll<SVGCircleElement, GraphNode>("circle.conflict-halo")
        .style("display", "inline")
        .style("opacity", 1.0);

      // Smoothly zoom back out if we were previously focused on a node
      if (wasSelected && zoomToFitRef.current) {
        zoomToFitRef.current(true);
      }
    }
  }, [selectedNode, isFleetFiltered, fleetCriteria]);

  const zoomToFitRef = useRef<((animate?: boolean) => void) | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    // Arrowhead markers for citations
    const defs = svg.append("defs");
    MODALITY_LEGEND.forEach(({ modality, color }) => {
      defs.append("marker")
        .attr("id", `arrow-${modality.toLowerCase()}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 16)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", color);
    });

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, activeDocFilter, activeCategoryFilter, searchQuery);
    const degree = computeDegree(filteredLinks);

    const padding = 70;
    const nodeHeightSpacing = 26;
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

    // Draw Column Headers
    const headerGroup = g.append("g").attr("class", "doc-headers");
    data.docs.forEach((docRef, docIndex) => {
      const x = width * (docIndex + 1) / (numDocs + 1);
      const isEu = docRef.id.toLowerCase().includes("eu") || docRef.label.toLowerCase().includes("eu");

      const colHeader = headerGroup.append("g")
        .attr("transform", `translate(${x}, ${padding - 35})`)
        .style("cursor", "default");

      colHeader.append("rect")
        .attr("x", -70)
        .attr("y", -14)
        .attr("width", 140)
        .attr("height", 28)
        .attr("rx", 8)
        .attr("fill", isEu ? "#f0f9ff" : "#f8fafc")
        .attr("stroke", docColorFor(data.docs, docRef.id))
        .attr("stroke-width", 1.5);

      colHeader.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 4)
        .attr("fill", isEu ? "#0369a1" : "#334155")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text(docLabel(data.docs, docRef.id, t));
    });

    const docIndexOf = new Map(data.docs.map((d, i) => [d.id, i]));
    const isLeftHalf = (docId: string) => (docIndexOf.get(docId) ?? 0) < numDocs / 2;

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

    // Initial Zoom to Fit calculation
    const zoomToFit = (animate = false) => {
      if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
      const currentWidth = containerRef.current.clientWidth || 800;
      const currentHeight = containerRef.current.clientHeight || 600;

      const maxColumnNodes = Math.max(...Array.from(nodesByDoc.values()).map(arr => arr.length), 1);
      const totalContentHeight = padding + maxColumnNodes * nodeHeightSpacing + 50;

      const scaleY = (currentHeight - 50) / totalContentHeight;
      const scaleX = (currentWidth - 50) / width;
      const fitScale = Math.max(0.2, Math.min(scaleX, scaleY, 1.0));

      const tx = (currentWidth - width * fitScale) / 2;
      const ty = 15;

      const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(fitScale);

      if (animate) {
        d3.select(svgRef.current)
          .transition()
          .duration(350)
          .call(zoomBehaviorRef.current.transform, targetTransform);
      } else {
        d3.select(svgRef.current).call(zoomBehaviorRef.current.transform, targetTransform);
      }
    };

    zoomToFitRef.current = zoomToFit;
    zoomToFit(false);

    const link = g.append("g")
      .selectAll("path.citation-link")
      .data(resolvedLinks)
      .join("path")
      .attr("class", "citation-link")
      .attr("d", d => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        if (s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) return "";
        
        // Intra-column (same document citation)
        if (Math.abs(s.x - t.x) < 5) {
          const left = isLeftHalf(s.doc);
          const dy = Math.abs(t.y - s.y);
          const curveRadius = Math.max(30, Math.min(dy * 0.4, 75));
          const offset = left ? -curveRadius : curveRadius;
          return `M${s.x},${s.y} C${s.x + offset},${s.y} ${s.x + offset},${t.y} ${t.x},${t.y}`;
        }

        // Inter-column (cross-document citation)
        const dx = t.x - s.x;
        const cp1x = s.x + dx * 0.45;
        const cp2x = t.x - dx * 0.45;
        return `M${s.x},${s.y} C${cp1x},${s.y} ${cp2x},${t.y} ${t.x},${t.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", d => modalityColor(d.modality))
      .attr("stroke-opacity", 0)
      .attr("stroke-width", 1.8)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none")
      .attr("marker-end", d => `url(#arrow-${d.modality.toLowerCase()})`)
      .style("cursor", "pointer");

    // Fade links in smoothly on (re)draw
    link.transition().duration(300).attr("stroke-opacity", 0.5);

    // Link hover interactions
    link.on("mouseenter", (event, d) => {
      if (!tooltipRef.current) return;
      const s = d.source as GraphNode;
      const tNode = d.target as GraphNode;
      const [mx, my] = d3.pointer(event, containerRef.current);
      
      const tooltip = d3.select(tooltipRef.current);
      tooltip
        .style("display", "block")
        .style("left", `${mx + 12}px`)
        .style("top", `${my + 12}px`)
        .html(`
          <div class="font-bold text-sky-400 text-xs mb-1">${s.label} ⟷ ${tNode.label}</div>
          <div class="text-[11px] text-slate-300">
            <span class="font-semibold text-amber-400">${t(d.modality.toLowerCase() as TranslationKey)}</span>
            ${d.snippet ? `<p class="mt-1 italic text-slate-400 leading-snug">"${d.snippet.slice(0, 120)}..."</p>` : ""}
          </div>
        `);
    })
    .on("mousemove", (event) => {
      if (!tooltipRef.current) return;
      const [mx, my] = d3.pointer(event, containerRef.current);
      d3.select(tooltipRef.current)
        .style("left", `${mx + 12}px`)
        .style("top", `${my + 12}px`);
    })
    .on("mouseleave", () => {
      if (!tooltipRef.current) return;
      d3.select(tooltipRef.current).style("display", "none");
    });

    const node = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(filteredNodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
      .style("cursor", "pointer")
      .style("opacity", d => {
        if (isFleetFiltered) {
          return matchesFleetCriteria(d, fleetCriteria!) ? 1.0 : 0.2;
        }
        return 1.0;
      });

    // Draw Conflict Dual-Ring Halos
    node.filter(d => conflictTargets.has(d.id))
      .append("circle")
      .attr("class", "conflict-halo")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18) + 4;
      })
      .attr("fill", "none")
      .attr("stroke", "#e11d48")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3, 2");

    node.append("circle")
      .attr("class", "primary-circle")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18);
      })
      .attr("fill", d => docColorFor(data.docs, d.doc))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    node.append("text")
      .text(d => d.label)
      .attr("x", d => isLeftHalf(d.doc) ? -15 : 15)
      .attr("y", 4)
      .attr("text-anchor", d => isLeftHalf(d.doc) ? "end" : "start")
      .attr("fill", "#475569")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    svg.on("click", (event) => {
      if (event.target === svgRef.current || (event.target as HTMLElement).tagName === "svg") {
        setSelectedNode(null);
      }
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
      link.style("stroke-opacity", 0.5);
      node.style("opacity", d => {
        if (isFleetFiltered) {
          return matchesFleetCriteria(d, fleetCriteria!) ? 1.0 : 0.2;
        }
        return 1.0;
      });
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
      if (zoomToFitRef.current) {
        zoomToFitRef.current(false);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery, isFleetFiltered, fleetCriteria, conflictTargets, setSelectedNode, t]);

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
    if (zoomToFitRef.current) {
      zoomToFitRef.current(true);
    }
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

  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [showDocText, setShowDocText] = useState(false);

  useEffect(() => {
    setShowDocText(false);
  }, [selectedNode?.id]);

  const nodeConnections = useMemo(() => {
    if (!selectedNode) return [];
    return data.links.filter(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return s === selectedNode.id || t === selectedNode.id;
    }).map(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      const isOutgoing = sId === selectedNode.id;
      const otherNodeId = isOutgoing ? tId : sId;
      const otherNode = data.nodes.find(n => n.id === otherNodeId);
      return {
        link: l,
        isOutgoing,
        otherNode
      };
    }).filter((item): item is { link: GraphLink; isOutgoing: boolean; otherNode: GraphNode } => item.otherNode !== undefined);
  }, [selectedNode, data.links, data.nodes]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#f8fafc]" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full block" style={{ outline: 'none' }} />

      {/* Floating Citation Tooltip */}
      <div 
        ref={tooltipRef} 
        className="pointer-events-none absolute z-30 hidden px-3.5 py-2.5 text-xs bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 max-w-sm backdrop-blur-xs transition-opacity duration-150"
      />

      {/* Top Center Selected Node HUD Bar */}
      {selectedNode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-white/95 border border-slate-200 rounded-full shadow-lg backdrop-blur-xs animate-in fade-in zoom-in-95 duration-200 select-none">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: docColorFor(data.docs, selectedNode.doc) }} />
          <span className="text-xs font-bold text-slate-900">{selectedNode.label}</span>
          <span className="text-[11px] text-slate-500">• {nodeConnections.length} {t("connections").toLowerCase()}</span>
          <button
            onClick={() => setIsRightDrawerOpen(prev => !prev)}
            className="ml-2 px-2.5 py-1 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <GitBranch className="w-3 h-3 text-sky-600" />
            {isRightDrawerOpen ? t("hideDetailsPanel") : t("showDetailsPanel")}
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full cursor-pointer transition-colors"
            title={t("clearSelection")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Toggle Button on Right for Details / Connections Panel */}
      {selectedNode && !isRightDrawerOpen && (
        <div className="absolute top-6 right-20 z-20 select-none">
          <button
            onClick={() => setIsRightDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 border border-slate-200 shadow-md backdrop-blur-xs transition-all cursor-pointer hover:border-sky-400 group"
          >
            <GitBranch className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">{t("connections")}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
              {nodeConnections.length}
            </span>
          </button>
        </div>
      )}

      {/* Zoom HUD Controls & Important Articles */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10 select-none">
        <div className="flex flex-col gap-1.5 bg-white/95 border border-slate-200 p-1.5 rounded-xl backdrop-blur-xs shadow-sm">
          <button 
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-semibold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-slate-800 shadow-2xs"
            title="Zoom ind"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-semibold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-slate-800 shadow-2xs"
            title="Zoom ud"
          >
            &minus;
          </button>
          <button 
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-slate-600 shadow-2xs"
            title="Nulstil zoom"
          >
            Reset
          </button>
        </div>

        {/* Top 10 nodes */}
        {top10Nodes.length > 0 && (
          <div className="flex flex-col gap-1.5 bg-white/95 border border-slate-200 p-2 rounded-xl backdrop-blur-xs shadow-sm max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-slate-400 text-center mb-0.5">
              Top 10
            </div>
            {top10Nodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleFocusNode(node.id)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border text-center ${
                  selectedNode?.id === node.id 
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs"
                }`}
                title={`Art. ${node.number}: ${node.title} (${node.degree} links)`}
              >
                {node.number}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optional Details sidebar drawer — toggled via button */}
      {selectedNode && isRightDrawerOpen && (
        <div className="absolute right-0 top-0 w-full sm:w-96 max-w-full bg-white border-l border-slate-200 flex flex-col h-full z-30 shadow-xl transition-all duration-300 animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 relative flex flex-col gap-2">
            <button 
              onClick={() => setIsRightDrawerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl cursor-pointer w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
              title={t("hideDetailsPanel")}
            >
              &times;
            </button>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                style={docBadgeStyle(data.docs, selectedNode.doc, { borderAlpha: "4d" })}
              >
                {docLabel(data.docs, selectedNode.doc, t)}
              </span>
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">
                {selectedNode.theme}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{selectedNode.label}</h2>
            <p className="text-xs text-slate-600 font-medium">{selectedNode.title || t("noTitle")}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* List connections at the TOP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-sky-600" />
                  {t("connections")}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {nodeConnections.length}
                </span>
              </div>

              {nodeConnections.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-xs text-slate-500 italic">{t("noConnections")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nodeConnections.map((item, i) => {
                    const { link, isOutgoing, otherNode } = item;
                    return (
                      <div 
                        key={i}
                        onClick={() => setSelectedNode(otherNode)}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-400 hover:shadow-md cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isOutgoing ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 shrink-0">
                                <ArrowUpRight className="w-3 h-3 text-sky-600" />
                                {t("outgoingCitation")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
                                <ArrowDownLeft className="w-3 h-3 text-indigo-600" />
                                {t("incomingCitation")}
                              </span>
                            )}
                            <span 
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border"
                              style={docBadgeStyle(data.docs, otherNode.doc, { borderAlpha: "4d" })}
                            >
                              {docLabel(data.docs, otherNode.doc, t)}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${modalityBadgeClasses(link.modality)}`}>
                            {t(link.modality.toLowerCase() as TranslationKey)}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                          {otherNode.label}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {otherNode.title || t("noHeading")}
                        </p>

                        {link.snippet && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic bg-slate-50/80 p-2 rounded leading-snug">
                            &ldquo;{link.snippet}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collapsible Document Text Accordion */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDocText(prev => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {t("documentText")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <span>{showDocText ? t("hideDocumentText") : t("showDocumentText")}</span>
                  {showDocText ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                </div>
              </button>

              {showDocText && (
                <div className="mt-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs leading-relaxed text-slate-800 max-h-72 overflow-y-auto whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                  {selectedNode.body}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
