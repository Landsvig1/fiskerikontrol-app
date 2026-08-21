"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Scale,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  X,
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
import { modalityColor, modalityBadgeClasses, MODALITY_LEGEND } from "@/lib/graphColors";
import { filterGraph, computeDegree } from "@/lib/graphFilter";
import { docLabel, docColorFor, docBadgeStyle, DocRef } from "@/lib/docDisplay";
import { explainConnection } from "@/lib/connectionExplainer";
import { themeLabel, CANONICAL_PROCESS_ORDER } from "@/lib/labels";
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
            fleetCriteria={fleetCriteria}
            setSelectedNode={setSelectedNode}
            t={t}
            lang={lang}
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
            fleetCriteria={fleetCriteria}
            t={t}
            lang={lang}
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
  const isFiltered =
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all";

  const filteredNodes = data.nodes.filter(n => matchesFleetCriteria(n, fleetCriteria));
  const realConflicts = data.conflicts.filter(record => {
    const targetNode = data.nodes.find(n => n.id === record.target);
    return targetNode && !targetNode.external && !targetNode.id.startsWith("external_");
  });
  const countsByDoc = data.docs.map(d => {
    const totalCount = data.nodes.filter(n => n.doc === d.id && !n.is_subnode).length;
    const count = filteredNodes.filter(n => n.doc === d.id && !n.is_subnode).length;
    return {
      ...d,
      totalCount,
      count,
    };
  });
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
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-3xl font-bold ${isEu ? "text-slate-900" : "text-slate-700"}`}>{d.count}</p>
                  {isFiltered && d.count !== d.totalCount && (
                    <span className="text-xs font-semibold text-slate-400">
                      / {d.totalCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {isFiltered
                    ? (lang === "da" ? `gældende artikler for flådeprofil` : `applicable articles for fleet`)
                    : (lang === "da" ? `analyserede artikler i retsakt` : `analyzed articles in act`)}
                </p>
              </div>
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

        <div 
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer" 
          onClick={() => setActiveTab("conflicts")}
        >
          <Scale className="w-7 h-7 text-slate-600 mb-4" />
          <h3 className="text-xs uppercase font-medium text-slate-500 tracking-wider">{t("conflictsCount")}</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-bold text-slate-900">{realConflicts.length}</p>
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1 hover:text-slate-900">{t("viewConflicts")} <ArrowRight className="w-3.5 h-3.5" /></span>
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
  fleetCriteria?: FleetFilterCriteria;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
  lang?: Lang;
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
  lang = "da"
}: D3GraphCanvasProps) {
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

    // Arrowhead markers for links
    const defs = svg.append("defs");
    MODALITY_LEGEND.forEach(({ modality, color }) => {
      defs.append("marker")
        .attr("id", `d3-arrow-${modality.toLowerCase()}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", color);
    });

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
    for (let i = 0; i < 280; ++i) simulation.tick();
    simulation.stop();

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

      const tx = currentWidth / 2 - midX * fitScale;
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

        const nodeDirections = new Map<string, "outgoing" | "incoming">();

        filteredLinks.forEach((l) => {
          if (!l) return;
          const sId = typeof l.source === "object" && l.source ? (l.source as GraphNode).id : String(l.source);
          const tId = typeof l.target === "object" && l.target ? (l.target as GraphNode).id : String(l.target);
          if (sId === selectedId) {
            connectedNodeIds.add(tId);
            nodeDirections.set(tId, "outgoing");
          } else if (tId === selectedId) {
            connectedNodeIds.add(sId);
            nodeDirections.set(sId, "incoming");
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
          const availHalfW = Math.max(currentW / 2 - marginX, 100);
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

          const tx = currentW / 2 - centerNode.x * targetScale;
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

    // Event listeners
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
      
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      
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
            <span>{lang === "da" ? "Flådefilter aktivt" : "Fleet filter active"}</span>
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
  lang?: Lang;
}

function InteractiveGraphView({ 
  data, 
  selectedNode, 
  setSelectedNode,
  activeDocFilter,
  setActiveDocFilter,
  activeCategoryFilter,
  setActiveCategoryFilter,
  fleetCriteria,
  t,
  lang = "da"
}: InteractiveGraphViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [showDocText, setShowDocText] = useState(false);
  const [expandedConnectionIndex, setExpandedConnectionIndex] = useState<number | null>(null);

  // Automatically fold down the left panel when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setIsLeftPanelOpen(false);
    }
    setShowDocText(false);
    setExpandedConnectionIndex(null);
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

      {/* Control panel sidebar — slides in/out smoothly */}
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
                  title={`${themeLabel(cat, lang)} (${count})`}
                >
                  {themeLabel(cat, lang)} ({count})
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
        fleetCriteria={fleetCriteria}
        setSelectedNode={setSelectedNode}
        t={t}
        lang={lang}
      />

      {/* Optional Details sidebar drawer — toggled via button */}
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
function cleanAndNormalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:;.]+/, "")
    .trim();
}

function highlightConflictKeywords(text: string) {
  if (!text) return null;
  const cleaned = cleanAndNormalizeText(text);
  const regex = /(skal|må ikke|forbudt|fritages|undtages|dispensation|betingelse|ikke omfattet|forpligtet|krav)/gi;
  const parts = cleaned.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      const lower = part.toLowerCase();
      if (lower === "skal" || lower === "forpligtet" || lower === "krav") {
        return (
          <span key={i} className="font-bold text-sky-950 bg-sky-100/90 px-1 py-0.2 mx-0.5 rounded text-[11px] inline-block align-baseline border border-sky-300/60">
            {part}
          </span>
        );
      }
      if (lower === "fritages" || lower === "undtages" || lower === "dispensation" || lower === "ikke omfattet") {
        return (
          <span key={i} className="font-bold text-amber-950 bg-amber-100/90 px-1 py-0.2 mx-0.5 rounded text-[11px] inline-block align-baseline border border-amber-300/60">
            {part}
          </span>
        );
      }
      return (
        <span key={i} className="font-bold text-rose-950 bg-rose-100/90 px-1 py-0.2 mx-0.5 rounded text-[11px] inline-block align-baseline border border-rose-300/60">
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
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#fafaf9] text-slate-900 w-full min-w-0">
      {/* View Header with Domain Context */}
      <div className="max-w-4xl space-y-2 mb-8 min-w-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 break-words">
              {t("conflictsHeaderTitle")}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {realConflicts.length} {lang === "da" ? "identificerede modstridskollisioner på tværs af retsakter" : "identified cross-act conflict collisions"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-1 break-words">
          {t("conflictsHeaderSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl w-full min-w-0">
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
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all duration-200 w-full min-w-0"
              >
                {/* 1. Header Block: Conflict Pair & Supremacy Badge */}
                <div className="p-5 border-b border-slate-200/80 bg-slate-50/60 flex items-start justify-between gap-4 flex-wrap min-w-0">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        <Scale className="w-3 h-3 text-slate-600 shrink-0" />
                        {lang === "da" ? "Modstrid: Krav vs. Undtagelse" : "Conflict: Rule vs. Exemption"}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border shrink-0 ${
                        isTargetEu && isSourceNational 
                          ? "bg-sky-100 text-sky-900 border-sky-300"
                          : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}>
                        {precedenceBadgeText}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 pt-0.5 break-words flex flex-wrap items-center gap-1.5">
                      <span className="text-sky-800 shrink-0">{targetNode.label}</span>
                      <span className="text-slate-400 font-normal">⟷</span>
                      <span className="text-amber-800 break-words">{sourceNode?.label || (lang === "da" ? "National bestemmelse" : "National rule")}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onInspectConflict(record)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {t("inspectConflict")}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedNode(targetNode);
                        setActiveTab("graph");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer shrink-0"
                    >
                      {t("showInGraph")} <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* 2. Middle Block: Side-by-Side Direct 'Krav vs. Undtagelse' Contrast Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fafaf9] min-w-0">
                  {/* Left Column: EU Rule (Skal-krav) */}
                  <div className="bg-white p-4.5 rounded-xl border border-sky-300 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          {t("euRuleLabel")}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 truncate max-w-[150px]"
                          style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "40" })}
                        >
                          {docLabel(data.docs, targetNode.doc, t)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 break-words line-clamp-2">
                        {targetNode.label} {targetNode.title ? `— ${cleanAndNormalizeText(targetNode.title)}` : ""}
                      </h4>
                    </div>

                    <div className="mt-3 p-3 bg-sky-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-sky-100 border-l-2 border-l-sky-600 break-words whitespace-normal overflow-hidden">
                      {highlightConflictKeywords(
                        (() => {
                          const parentNode = targetNode.parent_id ? data.nodes.find(n => n.id === targetNode.parent_id) : undefined;
                          const rawBody = targetNode.body && !targetNode.body.startsWith("See parent section") 
                            ? targetNode.body 
                            : (parentNode?.body || targetNode.body || record.description || "");
                          const cleanBody = cleanAndNormalizeText(rawBody);
                          return cleanBody.slice(0, 220) + (cleanBody.length > 220 ? "..." : "");
                        })()
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-amber-300 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {t("nationalDeviationLabel")}
                        </span>
                        {sourceNode && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 truncate max-w-[150px]"
                            style={docBadgeStyle(data.docs, sourceNode.doc, { borderAlpha: "40" })}
                          >
                            {docLabel(data.docs, sourceNode.doc, t)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 break-words line-clamp-2">
                        {sourceNode?.label || (lang === "da" ? "National sektion" : "National section")} {sourceNode?.title ? `— ${cleanAndNormalizeText(sourceNode.title)}` : ""}
                      </h4>
                    </div>

                    <div className="mt-3 p-3 bg-amber-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-amber-100 border-l-2 border-l-amber-600 break-words whitespace-normal overflow-hidden">
                      {highlightConflictKeywords(
                        (() => {
                          const rawText = primaryCitation?.snippet || sourceNode?.body || (lang === "da" ? "Dispenserende bestemmelse" : "Exemption rule");
                          const cleanSnippet = cleanAndNormalizeText(rawText);
                          return cleanSnippet.slice(0, 220) + (cleanSnippet.length > 220 ? "..." : "");
                        })()
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-100/70 border-t border-slate-200/80 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 mt-0.5 shrink-0">
                    <Lightbulb className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {t("inspectionVerdictTitle")}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-normal">
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
  t,
  lang = "da"
}: { 
  data: GraphData; 
  searchQuery: string; 
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  t: TranslateFn;
  lang?: Lang;
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
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded truncate max-w-[140px]" title={themeLabel(node.theme, lang)}>
                    {themeLabel(node.theme, lang)}
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
