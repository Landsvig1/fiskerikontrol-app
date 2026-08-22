"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  RefreshCw,
  FileText,
  Calendar,
} from "lucide-react";
import { CitationGraphView } from "@/components/CitationGraphView";
import { UploadScreen } from "@/components/UploadScreen";
import { ConflictInspectorModal } from "@/components/ConflictInspectorModal";
import { EnforcementTimelineView } from "@/components/EnforcementTimelineView";
import { DashboardView } from "@/components/views/DashboardView";
import { InteractiveGraphView } from "@/components/views/InteractiveGraphView";
import { OverlapsView } from "@/components/views/OverlapsView";
import { ConflictsView } from "@/components/views/ConflictsView";
import { BrowseView } from "@/components/views/BrowseView";
import { AuditMemoModal } from "@/components/AuditMemoModal";
import { FleetFilterCriteria, DEFAULT_FLEET_CRITERIA } from "@/lib/fleetFilter";
import { getT } from "@/lib/i18n";
import { DocRef } from "@/lib/docDisplay";
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

export type TabType = "dashboard" | "citation" | "graph" | "overlaps" | "conflicts" | "browse" | "timeline";

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
  
  // Listen for Escape key to unfocus/close selected node details.
  // Modals register their own Escape handler, so this one stands down while one is open;
  // otherwise a single Escape both closes the modal and clears the selection behind it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (inspectingConflict || isAuditMemoOpen) return;
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inspectingConflict, isAuditMemoOpen]);

  // Memoized: a fresh `t` on every render defeats React.memo on the graph canvases and
  // re-fires their teardown-and-rebuild effects, which include 280 synchronous force ticks.
  const t = useMemo(() => getT(), []);

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
          />
        )}
        {activeTab === "timeline" && (
          <EnforcementTimelineView 
            data={data}
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
          t={t}
        />
      )}
    </div>
  );
}
