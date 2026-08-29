"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import {
  Search,
  AlertTriangle,
  BookOpen,
  GitBranch,
  ArrowRight,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { FleetFilterCriteria, matchesFleetCriteria } from "@/lib/fleetFilter";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { modalityColor, modalityBadgeClasses } from "@/lib/graphColors";
import { filterGraph, computeDegree } from "@/lib/graphFilter";
import { buildNodeConnections, groupNodeConnections } from "@/lib/nodeConnections";
import { docLabel, docColorFor, docBadgeStyle } from "@/lib/docDisplay";
import { explainConnection } from "@/lib/connectionExplainer";
import { themeLabel, CANONICAL_PROCESS_ORDER } from "@/lib/labels";
import { GraphNode, GraphLink, GraphData } from "@/lib/types";

// ----------------------------------------------------
// VIEW 2: INTERACTIVE GRAPH VIEW (D3 SVG Canvas wrapper)
// ----------------------------------------------------
interface D3GraphCanvasProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | string;
  activeCategoryFilter: string;
  searchQuery: string;
  fleetCriteria?: FleetFilterCriteria;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
  rightInset?: number;
}

// Matches the drawer's sm:w-96 so the camera can frame around it.
const DRAWER_WIDTH_PX = 384;

// Ticks to settle a layout from scratch, and to relax one seeded from a cached layout.
// A cold run at full corpus (~1200 nodes) blocks the main thread for about a second, so
// the seeded path is what keeps filter changes and tab switches responsive.
const COLD_TICKS = 280;
const SEEDED_TICKS = 90;
// Distinct filter combinations to remember before dropping the older ones. Search text is
// part of the key, so this is bounded rather than unbounded.
const MAX_CACHED_LAYOUTS = 24;

type NodePositions = Map<string, { x: number; y: number }>;

interface LayoutCache {
  data: GraphData;
  bySignature: Map<string, NodePositions>;
  /** Most recently settled layout, used to seed a filter combination not seen before. */
  last: NodePositions | null;
}

const D3GraphCanvas = React.memo(function D3GraphCanvas({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  fleetCriteria,
  setSelectedNode,
  t,
  rightInset = 0
}: D3GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  // Settled force-layout positions, keyed on the filter combination that produced them.
  // See the tick loop below for why this exists.
  const layoutCacheRef = useRef<LayoutCache | null>(null);

  const isFleetFiltered = fleetCriteria && (
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all"
  );

  const conflictTargets = React.useMemo(() => {
    return new Set(
      data.conflicts
        .filter(c => {
          const tNode = data.nodes.find(n => n.id === c.target);
          return tNode && !tNode.external && !tNode.id.startsWith("external_");
        })
        .map(c => c.target)
    );
  }, [data.conflicts, data.nodes]);

  // Get top 10 most connected (important) nodes in the current filtered view
  const top10Nodes = React.useMemo(() => {
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, activeDocFilter, activeCategoryFilter, searchQuery, fleetCriteria);
    const degree = computeDegree(filteredLinks);

    return filteredNodes
      .map(n => ({ ...n, degree: degree[n.id] || 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery, fleetCriteria]);

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const circles = d3.select(svgRef.current).selectAll<SVGCircleElement, GraphNode>("circle.primary-circle");
    let targetNode: GraphNode | undefined;
    circles.each(function(d) {
      if (d.id === nodeId) {
        targetNode = d;
      }
    });
    if (!targetNode || targetNode.x === undefined || targetNode.y === undefined) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    setSelectedNode(targetNode);
    
    const targetScale = 1.0;
    const transform = d3.zoomIdentity
      .translate(width / 2 - targetNode.x * targetScale, height / 2 - targetNode.y * targetScale)
      .scale(targetScale);

    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, transform);
  };

  const applyNodeSelectionRef = useRef<((node: GraphNode | null, animate?: boolean) => void) | null>(null);
  const zoomToFitRef = useRef<((animate?: boolean) => void) | null>(null);

  // Width the connections drawer covers on the right. The camera frames the selected node
  // in the visible strip instead of the full canvas, otherwise selecting a node parks it
  // underneath the drawer. Never eats more than half the canvas on a narrow viewport.
  const rightInsetRef = useRef(rightInset);
  useEffect(() => {
    rightInsetRef.current = rightInset;
    if (selectedNodeRef.current) {
      applyNodeSelectionRef.current?.(selectedNodeRef.current, true);
    } else {
      zoomToFitRef.current?.(true);
    }
  }, [rightInset]);


  // Keep ref updated and apply selection
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    applyNodeSelectionRef.current?.(selectedNode, true);
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // Clear previous graph contents
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    // No arrowhead markers here: this view draws undirected straight lines and forces
    // marker-end to none on every state change. Direction is conveyed by the connections
    // drawer, not by the edges. The column view in CitationGraphView is the directed one.
    const g = svg.append("g");

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Deep copy nodes and links for simulation run
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    // Filter nodes and links based on UI state
    const { filteredNodes, filteredLinks } = filterGraph(nodes, links, activeDocFilter, activeCategoryFilter, searchQuery);

    // Degree calculations for node sizing
    const degree = computeDegree(filteredLinks);

    // Reuse a settled layout wherever possible.
    //
    // This effect tears down and rebuilds the whole canvas on every filter, fleet, search
    // and selection-plumbing change, and a cold settle is ~1.1s of blocked main thread at
    // full corpus. It also re-ran on every mount, so tabbing away and back both froze the
    // tab and scrambled the graph into a different random arrangement. Seeding node
    // positions from the previous run fixes both: an exact filter match replays the same
    // layout with no ticks at all, and a new filter combination relaxes from the old
    // positions instead of from d3's phyllotaxis spiral.
    //
    // Positions must be assigned before forceSimulation() is constructed: it only spirals
    // out nodes whose x/y are still NaN.
    const layoutSignature = JSON.stringify([activeDocFilter, activeCategoryFilter, searchQuery]);
    let cache = layoutCacheRef.current;
    if (!cache || cache.data !== data) {
      cache = { data, bySignature: new Map(), last: null };
      layoutCacheRef.current = cache;
    }
    const exactLayout = cache.bySignature.get(layoutSignature);
    const seedLayout = exactLayout ?? cache.last;
    if (seedLayout) {
      for (const node of filteredNodes) {
        const position = seedLayout.get(node.id);
        if (position) {
          node.x = position.x;
          node.y = position.y;
        }
      }
    }
    const tickCount = exactLayout ? 0 : seedLayout ? SEEDED_TICKS : COLD_TICKS;

    // Force simulation centered cleanly at origin (0, 0)
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(filteredLinks).id((d) => d.id).distance((d) => {
        const sId = typeof d.source === 'object' ? d.source.id : d.source;
        const tId = typeof d.target === 'object' ? d.target.id : d.target;
        const combinedDegree = (degree[sId] || 0) + (degree[tId] || 0);
        return 130 + Math.min(combinedDegree * 6, 120);
      }))
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(0, 0))
      .force("x", d3.forceX(0).strength(0.04))
      .force("y", d3.forceY(0).strength(0.04))
      .force("collide", d3.forceCollide<GraphNode>()
        .radius((d) => 18 + Math.min((degree[d.id] || 0) * 3.5, 45))
        .iterations(3))
      .velocityDecay(0.35);

    // Settle simulation synchronously around origin (0, 0)
    for (let i = 0; i < tickCount; ++i) simulation.tick();
    simulation.stop();

    if (!exactLayout) {
      const settled: NodePositions = new Map();
      for (const node of filteredNodes) {
        if (node.x === undefined || node.y === undefined) continue;
        settled.set(node.id, { x: node.x, y: node.y });
      }
      if (cache.bySignature.size >= MAX_CACHED_LAYOUTS) cache.bySignature.clear();
      cache.bySignature.set(layoutSignature, settled);
      cache.last = settled;
    }

    // Zoom-to-fit calculation to ensure entire graph is visible with middle node centered
    const zoomToFit = (animate = false) => {
      if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
      if (selectedNodeRef.current) {
        applyNodeSelection(selectedNodeRef.current, animate);
        return;
      }
      const currentWidth = containerRef.current.clientWidth || 800;
      const currentHeight = containerRef.current.clientHeight || 600;

      if (filteredNodes.length === 0) {
        const def = d3.zoomIdentity.translate(currentWidth / 2, currentHeight / 2).scale(1);
        d3.select(svgRef.current).call(zoomBehaviorRef.current.transform, def);
        return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const d of filteredNodes) {
        if (d.x === undefined || d.y === undefined) continue;
        const r = 20 + Math.min((degree[d.id] || 0) * 3.5, 45);
        if (d.x - r < minX) minX = d.x - r;
        if (d.x + r > maxX) maxX = d.x + r;
        if (d.y - r < minY) minY = d.y - r;
        if (d.y + r > maxY) maxY = d.y + r;
      }

      const padding = 100;
      const graphWidth = Math.max(maxX - minX + padding * 2, 100);
      const graphHeight = Math.max(maxY - minY + padding * 2, 100);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const scaleX = currentWidth / graphWidth;
      const scaleY = currentHeight / graphHeight;
      const fitScale = Math.max(0.06, Math.min(scaleX, scaleY, 0.95));

      const inset = Math.min(rightInsetRef.current, currentWidth / 2);
      const tx = (currentWidth - inset) / 2 - midX * fitScale;
      const ty = currentHeight / 2 - midY * fitScale;

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

    // Draw links
    const link = g.append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(filteredLinks)
      .join("line")
      .attr("x1", d => (d.source as GraphNode).x || 0)
      .attr("y1", d => (d.source as GraphNode).y || 0)
      .attr("x2", d => (d.target as GraphNode).x || 0)
      .attr("y2", d => (d.target as GraphNode).y || 0)
      .attr("stroke", d => modalityColor(d.modality))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none")
      .style("cursor", "pointer");

    // Link hover tooltip interaction
    link.on("mouseenter", (event, d) => {
      if (!tooltipRef.current) return;
      const s = typeof d.source === "object" ? (d.source as GraphNode) : data.nodes.find(n => n.id === d.source);
      const tNode = typeof d.target === "object" ? (d.target as GraphNode) : data.nodes.find(n => n.id === d.target);
      if (!s || !tNode) return;

      const [mx, my] = d3.pointer(event, containerRef.current);
      d3.select(tooltipRef.current)
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

    let hasDragged = false;

    // Drag behavior with built-in click detection
    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on("start", function() {
        hasDragged = false;
        d3.select(this).raise();
      })
      .on("drag", function(event, d) {
        if (Math.abs(event.dx) > 1 || Math.abs(event.dy) > 1) {
          hasDragged = true;
        }
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        link
          .filter(l => {
            const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return sId === d.id || tId === d.id;
          })
          .attr("x1", l => (l.source as GraphNode).x || 0)
          .attr("y1", l => (l.source as GraphNode).y || 0)
          .attr("x2", l => (l.target as GraphNode).x || 0)
          .attr("y2", l => (l.target as GraphNode).y || 0);
      })
      .on("end", function(event, d) {
        if (!hasDragged) {
          setSelectedNode(d);
        }
      });

    // Draw nodes
    const node = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g.node-group")
      .data(filteredNodes)
      .join("g")
      .attr("class", "node-group")
      .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
      .style("cursor", "pointer")
      .style("opacity", d => {
        if (isFleetFiltered) {
          return matchesFleetCriteria(d, fleetCriteria!) ? 1.0 : 0.2;
        }
        return 1.0;
      })
      .call(dragBehavior);

    // Conflict dual-ring halos
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

    // Primary circle
    node.append("circle")
      .attr("class", "primary-circle")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18);
      })
      .attr("fill", d => docColorFor(data.docs, d.doc))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // Node labels for prominent nodes (degree >= 3 or specific docs)
    node.append("text")
      .text(d => (degree[d.id] || 0) >= 3 ? d.label : "")
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", "#475569")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("pointer-events", "none");

    // Dedicated node selection and camera centering function
    const applyNodeSelection = (targetNode: GraphNode | null, animate = true) => {
      if (!svgRef.current || !containerRef.current) return;
      const svg = d3.select(svgRef.current);

      if (targetNode && targetNode.id) {
        const selectedId = targetNode.id;
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(selectedId);

        filteredLinks.forEach((l) => {
          if (!l) return;
          const sId = typeof l.source === "object" && l.source ? (l.source as GraphNode).id : String(l.source);
          const tId = typeof l.target === "object" && l.target ? (l.target as GraphNode).id : String(l.target);
          if (sId === selectedId) {
            connectedNodeIds.add(tId);
          } else if (tId === selectedId) {
            connectedNodeIds.add(sId);
          }
        });

        // Hide unconnected links, keep same downplayed line aesthetic for connected links
        link
          .style("display", (l) => {
            if (!l) return "none";
            const sId = typeof l.source === "object" && l.source ? (l.source as GraphNode).id : String(l.source);
            const tId = typeof l.target === "object" && l.target ? (l.target as GraphNode).id : String(l.target);
            return (sId === selectedId || tId === selectedId) ? "inline" : "none";
          })
          .style("stroke-opacity", (l) => {
            if (!l) return 0;
            const sId = typeof l.source === "object" && l.source ? (l.source as GraphNode).id : String(l.source);
            const tId = typeof l.target === "object" && l.target ? (l.target as GraphNode).id : String(l.target);
            return (sId === selectedId || tId === selectedId) ? 0.6 : 0;
          })
          .attr("stroke-width", 1.5)
          .attr("marker-end", "none");

        // Hide unconnected nodes completely, display only connected nodes
        node
          .style("display", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? "inline" : "none")
          .style("opacity", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? 1.0 : 0);

        // Keep standard clean text labels without heavy prefixes
        node.select<SVGTextElement>("text")
          .text((n) => (n && connectedNodeIds.has(n.id)) ? n.label : "")
          .style("opacity", 1.0)
          .style("font-size", "10px")
          .style("font-weight", "600")
          .attr("fill", (n) => (n && n.id === selectedId) ? "#0284c7" : "#475569");

        // Primary circle styling - keep same clean aesthetic
        node.select<SVGCircleElement>("circle.primary-circle")
          .attr("stroke-width", (n) => (n && n.id === selectedId) ? 2.5 : 1.5)
          .attr("stroke", (n) => (n && n.id === selectedId) ? "#0284c7" : "#ffffff");

        // Conflict halos
        node.select<SVGCircleElement>("circle.conflict-halo")
          .style("display", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? "inline" : "none");

        // Center on selected node and frame all connected neighbors comfortably
        const centerNode = filteredNodes.find(n => n.id === selectedId) || nodes.find(n => n.id === selectedId);
        const neighborNodes = filteredNodes.filter(n => n.id !== selectedId && connectedNodeIds.has(n.id));

        if (centerNode && centerNode.x !== undefined && centerNode.y !== undefined && zoomBehaviorRef.current) {
          const currentW = containerRef.current.clientWidth || 800;
          const currentH = containerRef.current.clientHeight || 600;

          const marginX = 140;
          const marginY = 100;
          const inset = Math.min(rightInsetRef.current, currentW / 2);
          const availHalfW = Math.max((currentW - inset) / 2 - marginX, 100);
          const availHalfH = Math.max(currentH / 2 - marginY, 80);

          let targetScale = 1.15;

          if (neighborNodes.length > 0) {
            let maxDx = 0;
            let maxDy = 0;
            for (const n of neighborNodes) {
              if (n.x === undefined || n.y === undefined) continue;
              const dx = Math.abs(n.x - centerNode.x);
              const dy = Math.abs(n.y - centerNode.y);
              if (dx > maxDx) maxDx = dx;
              if (dy > maxDy) maxDy = dy;
            }

            if (maxDx > 0 || maxDy > 0) {
              const scaleX = maxDx > 1 ? availHalfW / maxDx : Infinity;
              const scaleY = maxDy > 1 ? availHalfH / maxDy : Infinity;
              const fitScale = Math.min(scaleX, scaleY);
              if (fitScale !== Infinity && !isNaN(fitScale)) {
                targetScale = Math.max(0.35, Math.min(fitScale, 1.35));
              }
            }
          }

          const tx = (currentW - inset) / 2 - centerNode.x * targetScale;
          const ty = currentH / 2 - centerNode.y * targetScale;
          const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(targetScale);

          if (animate) {
            svg.transition().duration(400).call(zoomBehaviorRef.current.transform, targetTransform);
          } else {
            svg.call(zoomBehaviorRef.current.transform, targetTransform);
          }
        }
      } else {
        // Reset styling when no node is selected
        link
          .style("display", "inline")
          .style("stroke-opacity", 0.4)
          .attr("stroke-width", 1.5)
          .attr("marker-end", "none");

        node
          .style("display", "inline")
          .style("opacity", (n) => {
            if (!n) return 1.0;
            if (isFleetFiltered) {
              return matchesFleetCriteria(n, fleetCriteria!) ? 1.0 : 0.2;
            }
            return 1.0;
          });

        node.select<SVGTextElement>("text")
          .text((n) => (n && (degree[n.id] || 0) >= 3) ? n.label : "")
          .style("opacity", 1.0)
          .style("font-size", "10px")
          .style("font-weight", "600")
          .attr("fill", "#475569");

        node.select<SVGCircleElement>("circle.primary-circle")
          .attr("stroke-width", 1.5)
          .attr("stroke", "#ffffff");

        node.select<SVGCircleElement>("circle.conflict-halo")
          .style("display", "inline");

        if (animate && zoomToFitRef.current) {
          zoomToFitRef.current(true);
        }
      }
    };

    applyNodeSelectionRef.current = applyNodeSelection;

    // Event listeners. Node selection is dispatched from the drag behavior's "end" handler,
    // which distinguishes a click from a drag; a second click handler here would dispatch
    // setSelectedNode twice for every plain click.
    node.on("click", (event) => {
      event.stopPropagation();
    });

    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        setSelectedNode(null);
      }
    });

    node.on("mouseover", (event, d) => {
      if (selectedNodeRef.current) return;
      
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(d.id);

      link.style("stroke-opacity", l => {
        const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
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
      node.style("opacity", d => {
        if (isFleetFiltered) {
          return matchesFleetCriteria(d, fleetCriteria!) ? 1.0 : 0.2;
        }
        return 1.0;
      });
    });

    // Initial positioning
    if (selectedNodeRef.current) {
      applyNodeSelection(selectedNodeRef.current, false);
    } else {
      zoomToFit(false);
    }

    // Resize observer to handle drawer opening/closing and window resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
      
      // The layout lives in an origin-centered coordinate space that is independent of the
      // viewport; only the zoom transform maps it to screen. Re-centering the simulation on
      // the new viewport here would desync that mapping.
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
      
      if (selectedNodeRef.current) {
        applyNodeSelection(selectedNodeRef.current, false);
      } else if (zoomToFitRef.current) {
        zoomToFitRef.current(false);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      simulation.stop();
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

  return (
    <div ref={containerRef} className="flex-1 bg-[#f8fafc] relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />

      {/* Floating Citation Tooltip */}
      <div 
        ref={tooltipRef} 
        className="pointer-events-none absolute z-30 hidden px-3.5 py-2.5 text-xs bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 max-w-sm backdrop-blur-xs transition-opacity duration-150"
      />

      {/* Zoom HUD Controls & Important Articles */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10 select-none">
        {isFleetFiltered && (
          <div className="bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl text-[11px] font-bold text-sky-800 flex items-center gap-1.5 shadow-2xs">
            <Filter className="w-3 h-3 text-sky-600" />
            <span>{"Flådefilter aktivt"}</span>
          </div>
        )}

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
                title={`Sect. ${node.number}: ${node.title} (${node.degree} links)`}
              >
                {node.number}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Modality Legend overlay */}
      <div className="absolute bottom-6 left-6 bg-white/95 border border-slate-200 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-600 backdrop-blur-xs shadow-sm">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-3.5 h-0.5 bg-[#d97706] border-t border-dashed" />
          <span>{t("exception")}</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="w-3.5 h-0.5 bg-[#0284c7]" />
          <span>{t("obligation")}</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="w-3.5 h-0.5 bg-[#e11d48]" />
          <span>{t("prohibition")}</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="w-3.5 h-0.5 bg-[#059669]" />
          <span>{t("permission")}</span>
        </div>
      </div>
    </div>
  );
});

interface InteractiveGraphViewProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;
  activeDocFilter: "all" | string;
  setActiveDocFilter: (val: "all" | string) => void;
  activeCategoryFilter: string;
  setActiveCategoryFilter: (val: string) => void;
  fleetCriteria?: FleetFilterCriteria;
  t: TranslateFn;
}

export function InteractiveGraphView({ 
  data, 
  selectedNode, 
  setSelectedNode,
  activeDocFilter,
  setActiveDocFilter,
  activeCategoryFilter,
  setActiveCategoryFilter,
  fleetCriteria,
  t
}: InteractiveGraphViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // The graph effect tears down and rebuilds the whole SVG, including 280 synchronous force
  // ticks. Feeding it the raw input value ran that on every keystroke, so the canvas reads a
  // debounced copy instead.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [expandedConnectionKey, setExpandedConnectionKey] = useState<string | null>(null);

  // Automatically fold down the left panel when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setIsLeftPanelOpen(false);
    }
    setExpandedConnectionKey(null);
  }, [selectedNode]);

  // Group nodes by category to construct filters in logical process order
  const categories = Array.from(new Set(data.nodes.map(n => n.theme))).sort((a, b) => {
    const idxA = CANONICAL_PROCESS_ORDER.indexOf(a);
    const idxB = CANONICAL_PROCESS_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Scoped to the same subgraph the canvas draws, not to data.links. Listing connections
  // the canvas filtered out offers a switch-focus action that selects an undrawn node.
  const nodeConnections = useMemo(() => {
    const { filteredNodes, filteredLinks } = filterGraph(
      data.nodes,
      data.links,
      activeDocFilter,
      activeCategoryFilter,
      debouncedSearchQuery
    );
    return buildNodeConnections(selectedNode, filteredNodes, filteredLinks, data.conflicts);
  }, [selectedNode, data, activeDocFilter, activeCategoryFilter, debouncedSearchQuery]);

  const connectionGroups = useMemo(() => groupNodeConnections(nodeConnections), [nodeConnections]);

  return (
    <div className="flex-1 flex overflow-hidden relative bg-[#fafaf9]">
      {/* Floating Toggle for left Search/Filter Panel */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 select-none">
        <button
          onClick={() => setIsLeftPanelOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 hover:bg-white border text-xs font-semibold shadow-sm backdrop-blur-xs transition-all cursor-pointer ${
            isLeftPanelOpen ? "border-sky-400 text-sky-700 bg-sky-50/70" : "border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
          title={t("toggleFilters")}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
          <span>{t("toggleFilters")}</span>
          {(activeDocFilter !== "all" || activeCategoryFilter !== "all" || searchQuery) && (
            <span className="w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white" />
          )}
        </button>
      </div>

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
        <div className="absolute top-4 right-4 z-20 select-none">
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

      {/* Backdrop overlay when left control panel is open on mobile */}
      {isLeftPanelOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-20"
          onClick={() => setIsLeftPanelOpen(false)}
        />
      )}

      {/* Control panel sidebar, slides in/out smoothly */}
      <div
        className={`absolute md:relative inset-y-0 left-0 z-25 w-80 max-w-[85vw] bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto transform transition-all duration-300 shadow-sm ${
          isLeftPanelOpen ? "translate-x-0" : "-translate-x-full md:-ml-80"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            {t("toggleFilters")}
          </h3>
          <button 
            onClick={() => setIsLeftPanelOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            title={t("hideDetailsPanel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">{t("browse") /* Søg i graf */}</h3>
          <div className="relative">
            <input
              type="text"
              placeholder={"Indtast søgeord..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-sky-500 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Filter</h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveDocFilter("all")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold uppercase transition-all ${activeDocFilter === "all" ? "bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              {t("allDocuments")}
            </button>
            {data.docs.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveDocFilter(d.id)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-semibold uppercase flex items-center gap-2 transition-all ${activeDocFilter === d.id ? "bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: docColorFor(data.docs, d.id) }} />
                <span className="truncate">{docLabel(data.docs, d.id, t)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">{t("category")}</h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveCategoryFilter("all")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeCategoryFilter === "all" ? "bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              {t("allCategories")} ({data.nodes.length})
            </button>
            {categories.map(cat => {
              const count = data.nodes.filter(n => n.theme === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-semibold truncate transition-all ${activeCategoryFilter === cat ? "bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  title={`${themeLabel(cat)} (${count})`}
                >
                  {themeLabel(cat)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <D3GraphCanvas
        data={data}
        selectedNode={selectedNode}
        activeDocFilter={activeDocFilter}
        activeCategoryFilter={activeCategoryFilter}
        searchQuery={debouncedSearchQuery}
        rightInset={isRightDrawerOpen ? DRAWER_WIDTH_PX : 0}
        fleetCriteria={fleetCriteria}
        setSelectedNode={setSelectedNode}
        t={t}
      />

      {/* Optional Details sidebar drawer, toggled via button */}
      {selectedNode && isRightDrawerOpen && (
        <div className="absolute right-0 top-0 w-full sm:w-96 max-w-full bg-white border-l border-slate-200 flex flex-col h-full z-20 shadow-xl transition-all duration-300 animate-in slide-in-from-right duration-200">
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
                {themeLabel(selectedNode.theme)}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{selectedNode.label}</h2>
            <p className="text-xs text-slate-600 font-medium">{selectedNode.title || t("noTitle")}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* The provision you clicked, before anything said about it. */}
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {t("provisionText")}
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs leading-relaxed text-slate-800 max-h-72 overflow-y-auto whitespace-pre-wrap">
                {selectedNode.body}
              </div>
            </div>

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
                connectionGroups.map((group) => (
                <div key={group.key} className="space-y-2.5">
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                      group.key === "conflict" ? "text-rose-700" : "text-slate-500"
                    }`}>
                      {group.key === "conflict" ? t("groupConflict") : group.key === "outgoing" ? t("groupOutgoing") : t("groupIncoming")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">({group.items.length})</span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>
                  {group.items.map((item) => {
                    const { link, isOutgoing, otherNode } = item;
                    const connectionKey = `${group.key}:${otherNode.id}:${link.modality}:${isOutgoing ? "out" : "in"}`;
                    const isExpanded = expandedConnectionKey === connectionKey;
                    const explanation = explainConnection(
                      selectedNode,
                      otherNode,
                      link,
                      isOutgoing,
                      data.conflicts,
                      data.docs
                    );

                    return (
                      <div 
                        key={connectionKey}
                        className={`p-3.5 bg-white border rounded-xl transition-all duration-200 ${
                          isExpanded ? "border-sky-500 shadow-md ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Clickable Header that toggles explanation */}
                        <div 
                          onClick={() => setExpandedConnectionKey(prev => prev === connectionKey ? null : connectionKey)}
                          className="cursor-pointer select-none"
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
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${modalityBadgeClasses(link.modality)}`}>
                                {t(link.modality.toLowerCase() as TranslationKey)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-sky-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          <div className="text-xs font-bold text-slate-900 hover:text-sky-600 transition-colors flex items-center justify-between">
                            <span>{otherNode.label}</span>
                            {!isExpanded && (
                              <span className="text-[10px] text-sky-600 font-medium hover:underline flex items-center gap-0.5">
                                <span>{t("clickForExplanation")}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                            {otherNode.title || t("noHeading")}
                          </p>
                        </div>

                        {/* Expanded Comprehensive Connection Explanation */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Conflict Warning if present */}
                            {explanation.hasConflict && (
                              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px] flex flex-col gap-1">
                                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>{t("conflictWarning")}</span>
                                </div>
                                <p className="leading-snug">{explanation.conflictDescription}</p>
                              </div>
                            )}

                            {/* Legal Summary & Relationship Analysis */}
                            <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-lg flex flex-col gap-1.5">
                              <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                                <span>{t("explainConnectionTitle")}</span>
                              </div>
                              <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                                {explanation.summary}
                              </p>
                              <div className="text-[10px] text-slate-600 bg-white/80 p-1.5 rounded border border-sky-100 flex flex-col gap-0.5">
                                <span className="font-bold text-slate-700">{t("legalRelation")}:</span>
                                <span>{explanation.legalRole}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 italic">
                                {explanation.hierarchyContext}
                              </div>
                            </div>

                            {/* Citation snippet if present */}
                            {explanation.snippet && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                  {t("citationContext")}
                                </span>
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg italic text-[11px] text-slate-700 leading-snug">
                                  &ldquo;{explanation.snippet}&rdquo;
                                </div>
                              </div>
                            )}

                            {/* Connected Provision Text Excerpt */}
                            {otherNode.body && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                  {t("connectedTextSnippet")} ({otherNode.label})
                                </span>
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                                  {otherNode.body}
                                </div>
                              </div>
                            )}

                            {/* Action button to switch graph focus */}
                            <div className="pt-1 flex items-center justify-between gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNode(otherNode);
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>{t("switchFocusToProvision")}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Bottom Quick Dock for Connected Nodes */}
      {selectedNode && !isRightDrawerOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">
                  {t("connectedProvisions")} ({nodeConnections.length})
                </span>
                <span className="text-[11px] text-slate-400">• {t("selectedProvision")}: <strong className="text-slate-700">{selectedNode.label}</strong></span>
              </div>
              <button
                onClick={() => setIsRightDrawerOpen(true)}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t("showDetailsPanel")}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nodeConnections.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-1 text-center">
                {t("noConnections")}
              </p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                {nodeConnections.map((item, idx) => {
                  const { link, isOutgoing, otherNode } = item;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedNode(otherNode)}
                      className="flex-shrink-0 flex flex-col gap-1 p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/40 text-left transition-all duration-150 cursor-pointer max-w-[240px] group"
                      title={`${t("jumpToProvision")}: ${otherNode.label} - ${otherNode.title || ''}`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-1 min-w-0">
                          {isOutgoing ? (
                            <span className="text-[10px] font-bold text-sky-700 flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3 text-sky-600" />
                              {t("outgoingCitation")}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-0.5">
                              <ArrowDownLeft className="w-3 h-3 text-indigo-600" />
                              {t("incomingCitation")}
                            </span>
                          )}
                          <span 
                            className="text-[9px] font-bold px-1 py-0.2 rounded border"
                            style={docBadgeStyle(data.docs, otherNode.doc, { borderAlpha: "4d" })}
                          >
                            {docLabel(data.docs, otherNode.doc, t)}
                          </span>
                        </div>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${modalityBadgeClasses(link.modality)}`}>
                          {t(link.modality.toLowerCase() as TranslationKey)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 truncate">
                        {otherNode.label}
                      </div>
                      {otherNode.title && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {otherNode.title}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
