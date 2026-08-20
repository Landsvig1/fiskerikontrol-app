"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  AlertTriangle, 
  Layers, 
  BookOpen, 
  Activity, 
  GitBranch, 
  Database,
  ArrowRight,
  RefreshCw,
  Info,
  CheckCircle,
  ShieldAlert,
  FileText,
  Calendar,
  Lightbulb,
} from "lucide-react";
import * as d3 from "d3";
import { CitationGraphView } from "@/components/CitationGraphView";
import { UploadScreen } from "@/components/UploadScreen";
import { ConflictInspectorModal } from "@/components/ConflictInspectorModal";
import { FleetFilterBar } from "@/components/FleetFilterBar";
import { EnforcementTimelineView } from "@/components/EnforcementTimelineView";
import { AuditMemoModal } from "@/components/AuditMemoModal";
import { FleetFilterCriteria, DEFAULT_FLEET_CRITERIA, matchesFleetCriteria } from "@/lib/fleetFilter";
import { getT, Lang, TranslateFn, TranslationKey } from "@/lib/i18n";
import { modalityColor, modalityBadgeClasses } from "@/lib/graphColors";
import { filterGraph, computeDegree } from "@/lib/graphFilter";
import { docLabel, docColorFor, docBadgeStyle, DocRef } from "@/lib/docDisplay";
import {
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
} from "@/lib/types";

export type {
  DocRef,
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
};

type TabType = "dashboard" | "citation" | "graph" | "overlaps" | "conflicts" | "browse" | "timeline";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<GraphData | null>(null);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [inspectingConflict, setInspectingConflict] = useState<ConflictRecord | null>(null);
  const [isAuditMemoOpen, setIsAuditMemoOpen] = useState(false);
  const [fleetCriteria, setFleetCriteria] = useState<FleetFilterCriteria>(DEFAULT_FLEET_CRITERIA);
  const [activeDocFilter, setActiveDocFilter] = useState<"all" | string>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  
  const [lang, setLang] = useState<Lang>("da");

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("lexgraph-lang") as Lang | null;
    if (savedLang === "da" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lexgraph-lang", newLang);
  };

  // Listen for Escape key to unfocus/close selected node details
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const t = getT(lang);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafaf9] text-slate-900 font-sans">
        <RefreshCw className="w-10 h-10 text-sky-700 animate-spin mb-4" />
        <h2 className="text-base font-semibold text-slate-800">{t("loadingGraph")}</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <UploadScreen
        onSuccess={(parsedData) => {
          setData(parsedData);
          setActiveTab("dashboard");
        }}
        t={t}
        lang={lang}
        setLang={changeLang}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] text-slate-900 font-sans antialiased">
      {/* Top Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200 z-25 shadow-xs">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-sky-700" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              {t("appTitle")}
            </h1>
            <p className="text-xs text-slate-500">
              {t("appTagline")}
            </p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          {(["dashboard", "timeline", "citation", "graph", "overlaps", "conflicts", "browse"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab 
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {tab === "dashboard" && t("dashboard")}
              {tab === "timeline" && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-700" />
                  {t("timeline")}
                </span>
              )}
              {tab === "citation" && t("citationGraph")}
              {tab === "graph" && t("nodeGraph")}
              {tab === "overlaps" && `${t("overlaps")} (${data.overlaps.length})`}
              {tab === "conflicts" && `${t("conflicts")} (${data.conflicts.length})`}
              {tab === "browse" && t("browse")}
            </button>
          ))}
        </nav>

        {/* Right side controls: Audit Memo, Language, and Reset */}
        <div className="flex items-center gap-2.5">
          {/* Export Legal Audit Memo button */}
          <button
            type="button"
            onClick={() => setIsAuditMemoOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-sky-300" />
            {t("exportAuditMemo")}
          </button>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => changeLang("da")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                lang === "da" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              DA
            </button>
            <button
              type="button"
              onClick={() => changeLang("en")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                lang === "en" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              EN
            </button>
          </div>

          {/* New Analysis button */}
          <button
            onClick={() => {
              setData(null);
              setSelectedNode(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            {t("newAnalysis")}
          </button>
        </div>
      </header>

      {/* Main Application Container */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === "dashboard" && (
          <DashboardView 
            data={data} 
            setActiveTab={setActiveTab} 
            fleetCriteria={fleetCriteria}
            setFleetCriteria={setFleetCriteria}
            t={t}
            lang={lang}
          />
        )}
        {activeTab === "timeline" && (
          <EnforcementTimelineView 
            data={data}
            lang={lang}
            t={t}
            onInspectNode={(nodeLabel) => {
              const found = data.nodes.find(n => n.label.toLowerCase().includes(nodeLabel.toLowerCase()));
              if (found) {
                setSelectedNode(found);
                setActiveTab("citation");
              }
            }}
          />
        )}
        {activeTab === "citation" && (
          <CitationGraphView 
            data={data} 
            selectedNode={selectedNode}
            activeDocFilter={activeDocFilter}
            activeCategoryFilter={activeCategoryFilter}
            searchQuery={searchQuery}
            setSelectedNode={setSelectedNode}
            t={t}
          />
        )}
        {activeTab === "graph" && (
          <InteractiveGraphView 
            data={data} 
            selectedNode={selectedNode} 
            setSelectedNode={setSelectedNode} 
            activeDocFilter={activeDocFilter}
            setActiveDocFilter={setActiveDocFilter}
            activeCategoryFilter={activeCategoryFilter}
            setActiveCategoryFilter={setActiveCategoryFilter}
            t={t}
          />
        )}
        {activeTab === "overlaps" && (
          <OverlapsView 
            data={data} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
            t={t}
          />
        )}
        {activeTab === "conflicts" && (
          <ConflictsView 
            data={data} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
            onInspectConflict={setInspectingConflict}
            t={t}
            lang={lang}
          />
        )}
        {activeTab === "browse" && (
          <BrowseView 
            data={data} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
            t={t}
          />
        )}
      </main>

      {/* Side-by-Side Legal Conflict Inspector Modal */}
      {inspectingConflict && (
        <ConflictInspectorModal
          conflict={inspectingConflict}
          data={data}
          onClose={() => setInspectingConflict(null)}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setActiveTab("citation");
          }}
          t={t}
        />
      )}

      {/* 1-Click Exportable Legal Audit Memo Modal */}
      {isAuditMemoOpen && (
        <AuditMemoModal
          isOpen={isAuditMemoOpen}
          onClose={() => setIsAuditMemoOpen(false)}
          data={data}
          criteria={fleetCriteria}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// VIEW 1: DASHBOARD VIEW
// ----------------------------------------------------
function DashboardView({ 
  data, 
  setActiveTab, 
  fleetCriteria,
  setFleetCriteria,
  t,
  lang
}: { 
  data: GraphData; 
  setActiveTab: (tab: TabType) => void;
  fleetCriteria: FleetFilterCriteria;
  setFleetCriteria: (criteria: FleetFilterCriteria) => void;
  t: TranslateFn;
  lang: Lang;
}) {
  const filteredNodes = data.nodes.filter(n => matchesFleetCriteria(n, fleetCriteria));
  const countsByDoc = data.docs.map(d => ({
    ...d,
    count: filteredNodes.filter(n => n.doc === d.id && !n.is_subnode).length,
  }));
  const totalPrimaryNodes = filteredNodes.filter(n => !n.is_subnode).length;
  const totalCitations = data.links.length;
  const docLabels = data.docs.map(d => d.label);
  const docLabelList = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(docLabels);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fafaf9] text-slate-900">
      {/* Fleet & Scenario Filter Bar */}
      <FleetFilterBar
        criteria={fleetCriteria}
        onChange={setFleetCriteria}
        lang={lang}
        matchCount={filteredNodes.length}
        totalCount={data.nodes.length}
      />
      {/* Citation Graph Preview */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase font-bold text-sky-800 tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-700" /> {t("citationGraph")} {lang === "da" ? "Oversigt" : "Overview"}
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {lang === "da" ? "Klar" : "Ready"}
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          {lang === "da"
            ? `Grafen er genereret på baggrund af de uploadede dokumenter: ${docLabelList}. Netværket kortlægger sektionerne som noder og de modallogiske henvisninger som kanter.`
            : `The graph is generated based on the uploaded documents: ${docLabelList}. The network maps sections as nodes and modal logic references as edges.`
          }
        </p>

        <button
          onClick={() => setActiveTab("citation")}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {lang === "da" ? "Åbn Citation Graf" : "Open Citation Graph"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Intro Hero Section */}
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {lang === "da" ? "Kortlægning af dokumentcitationer og relationer" : "Mapping of Document Citations and Relations"}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {lang === "da"
            ? "Dette værktøj analyserer afhængigheder, krydsreferencer og logiske modstrid i de analyserede dokumenter. Ved at dekonstruere teksten til en struktur af noder (sektioner) og kanter (citationer/modallogiske bindinger) kan vi automatisk afdække overlap og uoverensstemmelser."
            : "This tool analyzes dependencies, cross-references, and logical conflicts in the analyzed documents. By deconstructing the text into a structure of nodes (sections) and edges (citations/modal logical bonds), we can automatically uncover overlaps and inconsistencies."
          }
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
        {countsByDoc.map(d => {
          const isEu = d.label.toLowerCase().includes("eu") || d.id.toLowerCase().includes("eu");
          return (
            <div
              key={d.id}
              className={`p-6 rounded-2xl shadow-xs transition-all duration-200 ${
                isEu
                  ? "bg-white border-2 border-sky-200 hover:border-sky-400"
                  : "bg-slate-50/60 border border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="w-7 h-7" style={{ color: docColorFor(data.docs, d.id) }} />
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  isEu
                    ? "bg-sky-100 text-sky-900 border border-sky-300 font-bold"
                    : "bg-slate-200/80 text-slate-600 border border-slate-300/80 font-normal"
                }`}>
                  {isEu 
                    ? lang === "da" ? "EU Primær" : "EU Primary" 
                    : lang === "da" ? "National" : "National"}
                </span>
              </div>
              <h3 className={`text-xs uppercase tracking-wider truncate ${isEu ? "font-bold text-slate-800" : "font-medium text-slate-500"}`}>
                {docLabel(data.docs, d.id, t)}
              </h3>
              <p className={`text-3xl font-bold mt-2 ${isEu ? "text-slate-900" : "text-slate-700"}`}>{d.count}</p>
            </div>
          );
        })}

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer" onClick={() => setActiveTab("overlaps")}>
          <GitBranch className="w-7 h-7 text-amber-600 mb-4" />
          <h3 className="text-xs uppercase font-medium text-slate-500 tracking-wider">{t("overlapsCount")}</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-bold text-slate-900">{data.overlaps.length}</p>
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">{t("viewAnalysis")} <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        <div className="bg-rose-50/40 border border-rose-200/80 p-6 rounded-2xl shadow-xs hover:border-rose-300 transition-all duration-200 cursor-pointer" onClick={() => setActiveTab("conflicts")}>
          <AlertTriangle className="w-7 h-7 text-rose-600 mb-4" />
          <h3 className="text-xs uppercase font-medium text-rose-800 tracking-wider">{t("conflictsCount")}</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-bold text-rose-900">{data.conflicts.length}</p>
            <span className="text-xs text-rose-700 font-medium flex items-center gap-1">{t("viewConflicts")} <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Graph Summary */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-700" /> {lang === "da" ? "Netværksstruktur" : "Network Structure"}
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === "da"
                ? <>Vi har udtrukket i alt <strong className="text-slate-900">{data.nodes.length} noder</strong> og etableret <strong className="text-slate-900">{totalCitations} relationer</strong> baseret på automatiske kildehenvisninger.</>
                : <>We have extracted a total of <strong className="text-slate-900">{data.nodes.length} nodes</strong> and established <strong className="text-slate-900">{totalCitations} relations</strong> based on automatic cross-references.</>
              }
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">{lang === "da" ? "Gennemsnitlige referencer pr. sektion" : "Average references per section"}</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{(totalCitations / Math.max(1, totalPrimaryNodes)).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">{lang === "da" ? "Modallogiske krydsreferencer" : "Modal logic cross-references"}</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCitations}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("graph")}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {lang === "da" ? "Åbn Interaktiv Netværksgraf" : "Open Interactive Network Graph"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* System Description */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700" /> {lang === "da" ? "Sådan fungerer analyse-motoren" : "How the Analysis Engine Works"}
          </h3>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {lang === "da"
                  ? <><strong>Modalklassificering:</strong> Hver krydsreference tildeles en modalitet (Forpligtelse, Undtagelse, Tilladelse, Forbud) ud fra tekstkonteksten (fx ord som <em>&quot;fritages&quot;</em>, <em>&quot;skal&quot;</em>, <em>&quot;må ikke&quot;</em>).</>
                  : <><strong>Modal Classification:</strong> Each cross-reference is assigned a modality (Obligation, Exception, Permission, Prohibition) based on the textual context (e.g., words like <em>&quot;exempted&quot;</em>, <em>&quot;shall&quot;</em>, <em>&quot;must not&quot;</em>).</>
                }
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {lang === "da"
                  ? <><strong>Kollisions-detektion:</strong> Hvis en sektion pålægger krav (Obligation), mens en anden sektion uafhængigt heraf tildeler en undtagelse (Exception) eller et forbud (Prohibition) i forhold til samme reference, flages dette som en potentiel konflikt.</>
                  : <><strong>Collision Detection:</strong> If one section imposes a requirement (Obligation), while another section independently grants an exception (Exception) or a prohibition (Prohibition) regarding the same reference, this is flagged as a potential conflict.</>
                }
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {lang === "da"
                  ? <><strong>Overlappende reference:</strong> Finder kernebestemmelser, som refereres af usædvanligt mange separate sektioner, hvilket øger kompleksiteten.</>
                  : <><strong>Overlapping Reference:</strong> Finds core provisions that are referenced by an unusually large number of separate sections, increasing complexity.</>
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 2: INTERACTIVE GRAPH VIEW (D3 SVG Canvas wrapper)
// ----------------------------------------------------
interface D3GraphCanvasProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | string;
  activeCategoryFilter: string;
  searchQuery: string;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
}

const D3GraphCanvas = React.memo(function D3GraphCanvas({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  setSelectedNode,
  t
}: D3GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);

  // Get top 10 most connected (important) nodes in the current filtered view
  const top10Nodes = React.useMemo(() => {
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
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery]);

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const circles = d3.select(svgRef.current).selectAll<SVGCircleElement, GraphNode>("circle");
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

  // Keep ref updated
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Secondary effect to handle persistent selections (nodes/links opacity & highlight) without resetting simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (selectedNode) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNode.id);

      // Highlight links connected to the selected node and dim the rest
      svg.selectAll("line").style("stroke-opacity", (d: unknown) => {
        const l = d as GraphLink;
        const sId = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
        if (sId === selectedNode.id || tId === selectedNode.id) {
          connectedNodeIds.add(sId);
          connectedNodeIds.add(tId);
          return 1.0;
        }
        return 0.08; // Dimmed
      });

      // Highlight selected node and direct connections
      svg.selectAll("circle")
        .style("opacity", (d: unknown) => {
          const n = d as GraphNode;
          return connectedNodeIds.has(n.id) ? 1.0 : 0.15;
        })
        .attr("stroke-width", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? 2.5 : 1.5;
        })
        .attr("stroke", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? "#0f172a" : "#ffffff";
        });
    } else {
      // Reset styling
      svg.selectAll("line").style("stroke-opacity", 0.4);
      svg.selectAll("circle")
        .style("opacity", 1.0)
        .attr("stroke-width", 1.5)
        .attr("stroke", "#ffffff");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // Clear previous graph contents
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Start zoomed out (scale of 0.3) centered
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.3);
    svg.call(zoom.transform, initialTransform);

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

    // Force simulation. Collision radius is degree-weighted so hub nodes (high citation
    // count) reserve enough space to avoid overlapping smaller leaf nodes in dense graphs.
    // velocityDecay adds friction so dynamic forces settle instead of vibrating/flying off-canvas.
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(filteredLinks).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-70))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>()
        .radius((d) => 8 + Math.min((degree[d.id] || 0) * 1.5, 30))
        .iterations(2))
      .velocityDecay(0.35);

    // Draw links
    const link = g.append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", d => modalityColor(d.modality))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none");

    // Draw nodes
    const node = g.append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(filteredNodes)
      .join("circle")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18);
      })
      .attr("fill", d => docColorFor(data.docs, d.doc))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Event listeners
    node.on("click", (event, d) => {
      setSelectedNode(d);
    });

    node.on("mouseover", (event, d) => {
      // Highlight hover node and connections (if no node is persistently selected)
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

    // Update node positions on tick. Clamp to a generous canvas margin so nodes under
    // strong dynamic forces settle within view instead of drifting off-canvas indefinitely.
    const boundsMargin = Math.max(width, height) * 2;
    simulation.on("tick", () => {
      for (const d of filteredNodes) {
        d.x = Math.max(-boundsMargin, Math.min(width + boundsMargin, d.x!));
        d.y = Math.max(-boundsMargin, Math.min(height + boundsMargin, d.y!));
      }

      link
         .attr("x1", d => (d.source as GraphNode).x!)
         .attr("y1", d => (d.source as GraphNode).y!)
         .attr("x2", d => (d.target as GraphNode).x!)
         .attr("y2", d => (d.target as GraphNode).y!);

      node
         .attr("cx", d => d.x!)
         .attr("cy", d => d.y!);
    });

    // Drag helper functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Resize observer to handle drawer opening/closing and window resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
      
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.1).restart();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      simulation.stop();
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
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.3);
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, initialTransform);
  };

  return (
    <div ref={containerRef} className="flex-1 bg-[#f8fafc] relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />

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
  t: TranslateFn;
}

function InteractiveGraphView({ 
  data, 
  selectedNode, 
  setSelectedNode,
  activeDocFilter,
  setActiveDocFilter,
  activeCategoryFilter,
  setActiveCategoryFilter,
  t
}: InteractiveGraphViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [controlPanelOpen, setControlPanelOpen] = useState(false);

  // Group nodes by category to construct filters
  const categories = Array.from(new Set(data.nodes.map(n => n.theme))).sort((a, b) => {
    return a.localeCompare(b);
  });

  return (
    <div className="flex-1 flex overflow-hidden relative bg-[#fafaf9]">
      {/* Mobile toggle for control panel */}
      <button
        onClick={() => setControlPanelOpen(v => !v)}
        className="md:hidden absolute top-3 left-3 z-30 bg-white border border-slate-200 rounded-lg p-2 text-slate-600 shadow-sm"
        aria-label={t("browse")}
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Backdrop overlay when control panel is open on mobile */}
      {controlPanelOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-20"
          onClick={() => setControlPanelOpen(false)}
        />
      )}

      {/* Control panel sidebar — slides in as an overlay on small screens, static on md+ */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-25 w-80 max-w-[85vw] bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto transform transition-transform duration-300 shadow-sm ${controlPanelOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div>
          <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">{t("browse") /* Søg i graf */}</h3>
          <div className="relative">
            <input
              type="text"
              placeholder={t("noHeading") === "(No title)" ? "Enter search term..." : "Indtast søgeord..."}
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
                  title={`${cat} (${count})`}
                >
                  {cat} ({count})
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
        searchQuery={searchQuery}
        setSelectedNode={setSelectedNode}
        t={t}
      />

      {/* Details sidebar drawer — full-width overlay on small screens, fixed w-96 on md+ */}
      {selectedNode && (
        <div className="absolute right-0 top-0 w-full sm:w-96 max-w-full bg-white border-l border-slate-200 flex flex-col h-full z-20 shadow-xl transition-all duration-300">
          <div className="p-6 border-b border-slate-200 bg-slate-50/70 relative flex flex-col gap-2">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl cursor-pointer"
            >
              &times;
            </button>
            <span
              className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
              style={docBadgeStyle(data.docs, selectedNode.doc, { borderAlpha: "4d" })}
            >
              {docLabel(data.docs, selectedNode.doc, t)}
            </span>
            <h2 className="text-lg font-bold text-slate-900">{selectedNode.label}</h2>
            <p className="text-xs text-slate-600 font-medium">{selectedNode.title || t("noTitle")}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t("category")}</h3>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                {selectedNode.theme}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t("documentText")}</h3>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs leading-relaxed text-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedNode.body}
              </div>
            </div>

            {/* List connections */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t("connections")}</h3>
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
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-white cursor-pointer transition-all duration-200 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{targetNode.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${modalityBadgeClasses(l.modality)}`}>
                          {t(l.modality.toLowerCase() as TranslationKey)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-1">{targetNode.title || t("noHeading")}</p>
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

// ----------------------------------------------------
// VIEW 3: OVERLAPS VIEW
// ----------------------------------------------------
function OverlapsView({ 
  data, 
  setSelectedNode, 
  setActiveTab,
  t
}: { 
  data: GraphData; 
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  t: TranslateFn;
}) {
  const overlapsList = data.overlaps.sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#fafaf9] text-slate-900">
      <div className="max-w-4xl space-y-2 mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="text-amber-600 w-6 h-6" /> {t("overlapsCount") /* Overlappende sektionsreferencer */}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {t("noTitle") === "(No heading)"
            ? "Below is a list of sections or provisions that are subject to multiple independent cross-references. These are indicators of regulatory complexity."
            : "Nedenfor vises en liste over bestemmelser, der er genstand for flere uafhængige kildehenvisninger. Dette er indikatorer for retlig kompleksitet."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {overlapsList.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
            {t("noTitle") === "(No heading)" ? "No overlaps detected." : "Ingen overlap fundet."}
          </div>
        ) : (
          overlapsList.map((record, i) => {
            const targetNode = data.nodes.find(n => n.id === record.target);
            if (!targetNode) return null;

            return (
              <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                        {t("noTitle") === "(No heading)" ? `Overlap (${record.count} references)` : `Overlap (${record.count} referencer)`}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded border"
                        style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "33" })}
                      >
                        {docLabel(data.docs, targetNode.doc, t)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mt-2 text-slate-900">
                      {t("noTitle") === "(No heading)" ? "Target Section: " : "Målsektion: "} <span className="text-sky-800">{targetNode.label}</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{targetNode.title}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedNode(targetNode);
                      setActiveTab("graph");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-white transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {t("showInGraph")} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">
                    {t("noTitle") === "(No heading)" ? "Referencing sections:" : "Refererende sektioner:"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {record.citations.map((c, idx) => {
                      const sourceNode = data.nodes.find(n => n.id === c.source);
                      return (
                        <div key={idx} className="bg-slate-50 p-4 border border-slate-200/80 rounded-xl flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{sourceNode?.label}</span>
                                {sourceNode && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded border"
                                    style={docBadgeStyle(data.docs, sourceNode.doc, { borderAlpha: "33" })}
                                  >
                                    {docLabel(data.docs, sourceNode.doc, t)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium">
                                {t(c.modality.toLowerCase() as TranslationKey)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs font-serif italic text-slate-600 block border-l-2 border-slate-300 pl-2 leading-relaxed">
                            &quot;...{c.snippet}...&quot;
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 4: CONFLICTS VIEW (KRAV VS. UNDTAGELSE CONTRAST)
// ----------------------------------------------------
function highlightConflictKeywords(text: string) {
  if (!text) return null;
  const regex = /(skal|må ikke|forbudt|fritages|undtages|dispensation|betingelse|ikke omfattet|forpligtet|krav)/gi;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      const lower = part.toLowerCase();
      if (lower === "skal" || lower === "forpligtet" || lower === "krav") {
        return (
          <span key={i} className="font-bold text-sky-900 bg-sky-100/90 px-1 py-0.5 rounded">
            {part}
          </span>
        );
      }
      if (lower === "fritages" || lower === "undtages" || lower === "dispensation" || lower === "ikke omfattet") {
        return (
          <span key={i} className="font-bold text-amber-900 bg-amber-100/90 px-1 py-0.5 rounded">
            {part}
          </span>
        );
      }
      return (
        <span key={i} className="font-bold text-rose-900 bg-rose-100/90 px-1 py-0.5 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
}

function ConflictsView({ 
  data, 
  setSelectedNode, 
  setActiveTab,
  onInspectConflict,
  t,
  lang,
}: { 
  data: GraphData; 
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  onInspectConflict: (conflict: ConflictRecord) => void;
  t: TranslateFn;
  lang: Lang;
}) {
  const realConflicts = data.conflicts.filter(record => {
    const targetNode = data.nodes.find(n => n.id === record.target);
    return targetNode && !targetNode.external && !targetNode.id.startsWith("external_");
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#fafaf9] text-slate-900">
      {/* View Header with Domain Context */}
      <div className="max-w-4xl space-y-2 mb-8">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-100/80 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("conflictsHeaderTitle")}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {realConflicts.length} {lang === "da" ? "identificerede modstridskollisioner på tværs af retsakter" : "identified cross-act conflict collisions"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-1">
          {t("conflictsHeaderSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {realConflicts.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
            {lang === "da" ? "Ingen retlige modstrid fundet i det indlæste korpus." : "No regulatory conflicts detected in loaded corpus."}
          </div>
        ) : (
          realConflicts.map((record, i) => {
            const targetNode = data.nodes.find(n => n.id === record.target);
            if (!targetNode) return null;

            const primaryCitation = record.citations[0];
            const sourceNode = primaryCitation ? data.nodes.find(n => n.id === primaryCitation.source) : undefined;
            const isTargetEu = targetNode.doc.toLowerCase().includes("eu") || targetNode.label.includes("EU") || targetNode.doc.includes("doc0") || targetNode.doc.includes("doc1") || targetNode.doc.includes("doc2") || targetNode.doc.includes("doc3") || targetNode.doc.includes("doc4");
            const isSourceNational = sourceNode ? (sourceNode.doc.toLowerCase().includes("bek") || sourceNode.doc.toLowerCase().includes("lov") || sourceNode.doc.includes("doc5") || sourceNode.doc.includes("doc6") || sourceNode.doc.includes("doc7") || sourceNode.doc.includes("doc8") || sourceNode.doc.includes("doc9")) : true;

            const precedenceBadgeText = isTargetEu && isSourceNational 
              ? (lang === "da" ? "⚖️ EU-forordning har forrang" : "⚖️ EU Regulation Takes Precedence")
              : (lang === "da" ? "⚖️ Retslig afklaring påkrævet" : "⚖️ Clarification Required");

            const verdictText = isTargetEu && isSourceNational
              ? (lang === "da"
                  ? `EU-forordningen (${targetNode.label}) er direkte gældende og har forrang over for dansk bekendtgørelse. Fiskeristyrelsens tilsyn kan ikke lovligt håndhæve en national dispensation i modstrid med EU-kravet, og fartøjer risikerer overtrædelsessag ved EU-inspektion eller ved landing i andre EU-medlemsstater.`
                  : `The EU regulation (${targetNode.label}) applies directly and supersedes Danish national orders. The Danish Fisheries Agency cannot lawfully enforce a national exemption that contradicts mandatory EU requirements.`)
              : (lang === "da"
                  ? `Der foreligger modstridende modaliteter mellem bestemmelserne. Delegerede retsakter og bekendtgørelser skal fortolkes i overensstemmelse med grundforordningens kontrolformål.`
                  : `Contradictory modalities detected between provisions. Secondary acts must be interpreted in compliance with baseline control objectives.`);

            return (
              <div 
                key={i} 
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all duration-200"
              >
                {/* 1. Header Block: Conflict Pair & Supremacy Badge */}
                <div className="p-5 border-b border-slate-200/80 bg-slate-50/60 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-100/80 border border-rose-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {lang === "da" ? "Modstrid: Krav vs. Undtagelse" : "Conflict: Rule vs. Exemption"}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                        isTargetEu && isSourceNational 
                          ? "bg-sky-100 text-sky-900 border-sky-300"
                          : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}>
                        {precedenceBadgeText}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 pt-0.5">
                      <span className="text-sky-800">{targetNode.label}</span>
                      <span className="text-slate-400 font-normal mx-2">⟷</span>
                      <span className="text-amber-800">{sourceNode?.label || (lang === "da" ? "National bestemmelse" : "National rule")}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onInspectConflict(record)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      {t("inspectConflict")}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedNode(targetNode);
                        setActiveTab("graph");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
                    >
                      {t("showInGraph")} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Middle Block: Side-by-Side Direct 'Krav vs. Undtagelse' Contrast Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fafaf9]">
                  {/* Left Column: EU Rule (Skal-krav) */}
                  <div className="bg-white p-4.5 rounded-xl border border-sky-300 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                          {t("euRuleLabel")}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded border"
                          style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "40" })}
                        >
                          {docLabel(data.docs, targetNode.doc, t)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{targetNode.label} {targetNode.title ? `— ${targetNode.title}` : ""}</h4>
                    </div>

                    <div className="mt-3 p-3 bg-sky-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-sky-100 border-l-2 border-l-sky-600">
                      {highlightConflictKeywords(
                        (() => {
                          const parentNode = targetNode.parent_id ? data.nodes.find(n => n.id === targetNode.parent_id) : undefined;
                          const rawBody = targetNode.body && !targetNode.body.startsWith("See parent section") 
                            ? targetNode.body 
                            : (parentNode?.body || targetNode.body || record.description || "");
                          return rawBody.slice(0, 240) + (rawBody.length > 240 ? "..." : "");
                        })()
                      )}
                    </div>
                  </div>

                  {/* Right Column: National Exemption (Dispensation/Undtagelse) */}
                  <div className="bg-white p-4.5 rounded-xl border border-amber-300 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          {t("nationalDeviationLabel")}
                        </span>
                        {sourceNode && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={docBadgeStyle(data.docs, sourceNode.doc, { borderAlpha: "40" })}
                          >
                            {docLabel(data.docs, sourceNode.doc, t)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{sourceNode?.label || "National sektion"} {sourceNode?.title ? `— ${sourceNode?.title}` : ""}</h4>
                    </div>

                    <div className="mt-3 p-3 bg-amber-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-amber-100 border-l-2 border-l-amber-600">
                      {highlightConflictKeywords(primaryCitation?.snippet || sourceNode?.body?.slice(0, 220) || (lang === "da" ? "Dispenserende bestemmelse" : "Exemption rule"))}
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Block: Plain-Danish Verdict Banner */}
                <div className="px-6 py-4 bg-slate-100/70 border-t border-slate-200/80 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 mt-0.5 shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {t("inspectionVerdictTitle")}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {verdictText}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 5: BROWSE VIEW (Searchable List)
// ----------------------------------------------------
function BrowseView({ 
  data, 
  searchQuery, 
  setSearchQuery, 
  setSelectedNode, 
  setActiveTab,
  t
}: { 
  data: GraphData; 
  searchQuery: string; 
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  t: TranslateFn;
}) {
  const filteredNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return data.nodes;
    const query = searchQuery.toLowerCase().trim();
    const queryNum = parseInt(query, 10);
    const isNumericQuery = /^\d+$/.test(query);

    const matches = data.nodes.filter(n => {
      return n.label.toLowerCase().includes(query) || 
             n.title.toLowerCase().includes(query) || 
             n.body.toLowerCase().includes(query) ||
             n.theme.toLowerCase().includes(query);
    });

    return matches.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (isNumericQuery) {
        if (a.number === queryNum) scoreA += 1000;
        if (b.number === queryNum) scoreB += 1000;
        
        const lowerQuery = query.toLowerCase();
        if (a.label.toLowerCase().includes(lowerQuery)) scoreA += 500;
        if (b.label.toLowerCase().includes(lowerQuery)) scoreB += 500;
      }

      // Prioritize match directly in the title
      if (a.title.toLowerCase() === query) scoreA += 300;
      if (b.title.toLowerCase() === query) scoreB += 300;

      if (a.title.toLowerCase().includes(query)) scoreA += 100;
      if (b.title.toLowerCase().includes(query)) scoreB += 100;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.number - b.number;
    });
  }, [data.nodes, searchQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fafaf9] text-slate-900">
      <div className="p-8 bg-white border-b border-slate-200 space-y-4 shadow-2xs">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("noTitle") === "(No heading)" ? "Browse Sections" : "Gennemse sektioner"}</h2>
        <div className="max-w-xl relative">
          <input
            type="text"
            placeholder={t("noTitle") === "(No heading)" ? "Search in text, sections, categories..." : "Søg i tekst, sektioner, kategorier..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 pl-11 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-xs transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
          {filteredNodes.map(node => (
            <div 
              key={node.id} 
              className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-400 hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded truncate max-w-[180px]"
                    style={docBadgeStyle(data.docs, node.doc, { bgAlpha: "26" })}
                    title={docLabel(data.docs, node.doc, t)}
                  >
                    {docLabel(data.docs, node.doc, t)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded truncate max-w-[140px]" title={node.theme}>
                    {node.theme}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-3">{node.label}</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">{node.title || t("noTitle")}</p>
                
                <p className="text-xs text-slate-600 leading-relaxed mt-4 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  {node.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedNode(node);
                    setActiveTab("graph");
                  }}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1.5 cursor-pointer"
                >
                  {t("noTitle") === "(No heading)" ? "Inspect connections" : "Inspicer forbindelser"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
