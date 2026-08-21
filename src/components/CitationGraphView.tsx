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
  ArrowRight,
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  X,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { explainConnection } from "@/lib/connectionExplainer";
import { themeLabel } from "@/lib/labels";

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
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [showDocText, setShowDocText] = useState(false);
  const [expandedConnectionIndex, setExpandedConnectionIndex] = useState<number | null>(null);

  useEffect(() => {
    setShowDocText(false);
    setExpandedConnectionIndex(null);
  }, [selectedNode?.id]);

  const isFleetFiltered = fleetCriteria && (
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all"
  );

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
    <div className="flex-1 flex flex-col min-h-0 bg-[#fafaf9] relative border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Top Left Modality & Document Legend */}
      <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none select-none">
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

      {/* Main Canvas Area */}
      <div className="flex-1 bg-[#f8fafc] overflow-hidden relative">
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

      {/* Optional Details sidebar drawer, toggled via button */}
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
                {themeLabel(selectedNode.theme, lang)}
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
                <div className="space-y-2.5">
                  {nodeConnections.map((item, i) => {
                    const { link, isOutgoing, otherNode } = item;
                    const isExpanded = expandedConnectionIndex === i;
                    const explanation = explainConnection(
                      selectedNode,
                      otherNode,
                      link,
                      isOutgoing,
                      data.conflicts,
                      data.docs,
                      lang
                    );

                    return (
                      <div 
                        key={i}
                        className={`p-3.5 bg-white border rounded-xl transition-all duration-200 ${
                          isExpanded ? "border-sky-500 shadow-md ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Clickable Header that toggles explanation */}
                        <div 
                          onClick={() => setExpandedConnectionIndex(prev => prev === i ? null : i)}
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

  const applyNodeSelectionRef = useRef<((node: GraphNode | null, animate?: boolean) => void) | null>(null);
  const zoomToFitRef = useRef<((animate?: boolean) => void) | null>(null);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    applyNodeSelectionRef.current?.(selectedNode, true);
  }, [selectedNode]);

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

    const docOrder = data.docs.map(d => d.id);
    const numDocs = Math.max(docOrder.length, 1);
    const colSpacing = width / (numDocs + 1);

    const nodeHeightSpacing = 36;
    const padding = 50;

    const nodesByDoc = new Map<string, GraphNode[]>();
    docOrder.forEach(docId => nodesByDoc.set(docId, []));

    filteredNodes.forEach(node => {
      if (!nodesByDoc.has(node.doc)) {
        nodesByDoc.set(node.doc, []);
      }
      nodesByDoc.get(node.doc)!.push(node);
    });

    nodesByDoc.forEach((docNodes) => {
      docNodes.sort((a, b) => a.number - b.number);
    });

    // Compute column layouts
    docOrder.forEach((docId, colIndex) => {
      const colX = colSpacing * (colIndex + 1);
      const docNodes = nodesByDoc.get(docId) || [];

      // Column Header Group
      const headerGroup = g.append("g")
        .attr("transform", `translate(${colX}, 25)`)
        .attr("class", "column-header");

      headerGroup.append("circle")
        .attr("r", 4.5)
        .attr("cx", -8)
        .attr("cy", -1)
        .attr("fill", docColorFor(data.docs, docId));

      headerGroup.append("text")
        .text(docLabel(data.docs, docId, t))
        .attr("x", 4)
        .attr("y", 3)
        .attr("text-anchor", "start")
        .attr("fill", "#0f172a")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");

      // Position nodes
      docNodes.forEach((node, rowIndex) => {
        node.x = colX;
        node.y = padding + rowIndex * nodeHeightSpacing;
      });
    });

    const isLeftHalf = (docId: string) => {
      const idx = docOrder.indexOf(docId);
      return idx < numDocs / 2;
    };

    const nodeMap = new Map<string, GraphNode>();
    filteredNodes.forEach(n => nodeMap.set(n.id, n));

    const resolvedLinks = filteredLinks.map(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return {
        ...l,
        source: nodeMap.get(sourceId) as GraphNode,
        target: nodeMap.get(targetId) as GraphNode
      };
    }).filter(l => l.source && l.target);

    // Zoom to Fit calculation
    const zoomToFit = (animate = false) => {
      if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
      if (selectedNodeRef.current) {
        applyNodeSelection(selectedNodeRef.current, animate);
        return;
      }
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

    const link = g.append("g")
      .selectAll("path.citation-link")
      .data(resolvedLinks)
      .join("path")
      .attr("class", "citation-link")
      .attr("d", d => {
        const s = d.source as GraphNode;
        const tNode = d.target as GraphNode;
        if (!s || !tNode || s.x === undefined || s.y === undefined || tNode.x === undefined || tNode.y === undefined) return "";
        
        // Intra-column (same document citation)
        if (Math.abs(s.x - tNode.x) < 5) {
          const left = isLeftHalf(s.doc);
          const dy = Math.abs(tNode.y - s.y);
          const curveRadius = Math.max(30, Math.min(dy * 0.4, 75));
          const offset = left ? -curveRadius : curveRadius;
          return `M${s.x},${s.y} C${s.x + offset},${s.y} ${s.x + offset},${tNode.y} ${tNode.x},${tNode.y}`;
        }

        // Inter-column (cross-document citation)
        const dx = tNode.x - s.x;
        const cp1x = s.x + dx * 0.45;
        const cp2x = tNode.x - dx * 0.45;
        return `M${s.x},${s.y} C${cp1x},${s.y} ${cp2x},${tNode.y} ${tNode.x},${tNode.y}`;
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
      if (!tooltipRef.current || !d || !d.source || !d.target) return;
      const s = d.source as GraphNode;
      const tNode = d.target as GraphNode;
      const [mx, my] = d3.pointer(event, containerRef.current);
      
      const tooltip = d3.select(tooltipRef.current);
      tooltip
        .style("display", "block")
        .style("left", `${mx + 12}px`)
        .style("top", `${my + 12}px`)
        .html(`
          <div class="font-bold text-sky-400 text-xs mb-1">${s.label || s.id} ⟷ ${tNode.label || tNode.id}</div>
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

    // Dedicated node selection and camera centering function
    const applyNodeSelection = (targetNode: GraphNode | null, animate = true) => {
      if (!svgRef.current || !containerRef.current) return;
      const svgEl = d3.select(svgRef.current);

      if (targetNode && targetNode.id) {
        const selectedId = targetNode.id;
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(selectedId);

        resolvedLinks.forEach((l) => {
          if (!l || !l.source || !l.target) return;
          const sId = (l.source as GraphNode).id;
          const tId = (l.target as GraphNode).id;
          if (sId === selectedId) {
            connectedNodeIds.add(tId);
          } else if (tId === selectedId) {
            connectedNodeIds.add(sId);
          }
        });

        // Hide unconnected links, keep same aesthetic for connected links
        link
          .style("display", (l) => {
            if (!l || !l.source || !l.target) return "none";
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return (sId === selectedId || tId === selectedId) ? "inline" : "none";
          })
          .style("stroke-opacity", (l) => {
            if (!l || !l.source || !l.target) return 0;
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return (sId === selectedId || tId === selectedId) ? 0.6 : 0;
          })
          .attr("stroke-width", 1.8)
          .attr("marker-end", (d) => `url(#arrow-${d.modality.toLowerCase()})`);

        // Hide unconnected nodes completely, display only connected nodes
        node
          .style("display", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? "inline" : "none")
          .style("opacity", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? 1.0 : 0);

        // Keep clean standard node text labels
        node.select<SVGTextElement>("text")
          .text((n) => (n && connectedNodeIds.has(n.id)) ? n.label : "")
          .style("opacity", 1.0)
          .style("font-size", "11px")
          .style("font-weight", "600")
          .attr("fill", (n) => (n && n.id === selectedId) ? "#0284c7" : "#475569");

        // Primary circle styling - keep same clean aesthetic
        node.select<SVGCircleElement>("circle.primary-circle")
          .attr("stroke-width", (n) => (n && n.id === selectedId) ? 2.5 : 1.5)
          .attr("stroke", (n) => (n && n.id === selectedId) ? "#0284c7" : "#ffffff");

        // Conflict halos
        node.select<SVGCircleElement>("circle.conflict-halo")
          .style("display", (n) => (n && n.id && connectedNodeIds.has(n.id)) ? "inline" : "none");

        // Center on selected node and zoom so furthest connected node is framed nicely
        const centerNode = nodeMap.get(selectedId) || filteredNodes.find(n => n.id === selectedId);
        const neighborNodes = filteredNodes.filter(n => n.id !== selectedId && connectedNodeIds.has(n.id));

        if (centerNode && centerNode.x !== undefined && centerNode.y !== undefined && zoomBehaviorRef.current) {
          const currentW = containerRef.current.clientWidth || 800;
          const currentH = containerRef.current.clientHeight || 600;

          const marginX = 130;
          const marginY = 90;
          const availHalfW = Math.max(currentW / 2 - marginX, 100);
          const availHalfH = Math.max(currentH / 2 - marginY, 80);

          let targetScale = 1.35;

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
                targetScale = Math.max(0.65, Math.min(fitScale, 1.8));
              }
            }
          }

          const tx = currentW / 2 - centerNode.x * targetScale;
          const ty = currentH / 2 - centerNode.y * targetScale;
          const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(targetScale);

          if (animate) {
            svgEl.transition().duration(400).call(zoomBehaviorRef.current.transform, targetTransform);
          } else {
            svgEl.call(zoomBehaviorRef.current.transform, targetTransform);
          }
        }
      } else {
        // Reset styling
        link
          .style("display", "inline")
          .style("stroke-opacity", 0.5)
          .attr("stroke-width", 1.8)
          .attr("marker-end", (d) => `url(#arrow-${d.modality.toLowerCase()})`);

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
          .text((n) => n ? n.label : "")
          .style("opacity", 1.0)
          .style("font-size", "11px")
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

    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
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

    // Initial positioning
    if (selectedNodeRef.current) {
      applyNodeSelection(selectedNodeRef.current, false);
    } else {
      zoomToFit(false);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
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

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#f8fafc]" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full block" style={{ outline: 'none' }} />

      {/* Floating Citation Tooltip */}
      <div 
        ref={tooltipRef} 
        className="pointer-events-none absolute z-30 hidden px-3.5 py-2.5 text-xs bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 max-w-sm backdrop-blur-xs transition-opacity duration-150"
      />

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

      {/* Document Columns Legend / Quick Reference Bottom Panel */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 max-w-[calc(100vw-32px)] pointer-events-auto select-none">
        {data.docs.map((doc) => {
          const count = data.nodes.filter(n => n.doc === doc.id).length;
          return (
            <div
              key={doc.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 shadow-2xs backdrop-blur-xs text-[11px] font-semibold text-slate-700"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: docColorFor(data.docs, doc.id) }} />
              <span className="truncate max-w-40">{docLabel(data.docs, doc.id, t)}</span>
              <span className="text-[10px] text-slate-400 font-bold">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
