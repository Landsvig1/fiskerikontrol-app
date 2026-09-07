"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Copy,
  Check,
  Layers,
  Shield,
} from "lucide-react";
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MatrixNode,
  MatrixColumn,
  TimelineYear,
  getConnectedNodes,
} from "../lib/matrixData";
import { MATRIX_SCENARIOS } from "../lib/matrixScenarios";

interface MatrixExplorerProps {
  selectedNodeId?: string | null;
  selectedYear?: TimelineYear;
  onSelectNode?: (nodeId: string | null) => void;
  onSelectYear?: (year: TimelineYear) => void;
}

export function MatrixExplorer({
  selectedNodeId: propSelectedNodeId,
  selectedYear: propSelectedYear = 2026,
  onSelectNode,
  onSelectYear,
}: MatrixExplorerProps) {
  // Default to actor_micro so "Forbundne Krydsfelter i Kontrolkæden" is populated immediately
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string>("actor_micro");
  const [internalYear, setInternalYear] = useState<TimelineYear>(propSelectedYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [copiedLinkNotification, setCopiedLinkNotification] = useState(false);
  const [activeTab, setActiveTab] = useState<"chain" | "matrix">("chain");

  const activeNodeId =
    propSelectedNodeId !== undefined && propSelectedNodeId !== null
      ? propSelectedNodeId
      : internalSelectedNodeId;

  const activeYear = propSelectedYear !== undefined ? propSelectedYear : internalYear;

  const handleSelectNode = useCallback(
    (id: string | null) => {
      const nextId = id || "actor_micro";
      if (onSelectNode) {
        onSelectNode(nextId);
      } else {
        setInternalSelectedNodeId(nextId);
      }
    },
    [onSelectNode]
  );

  const handleSelectYear = useCallback(
    (year: TimelineYear) => {
      if (onSelectYear) {
        onSelectYear(year);
      } else {
        setInternalYear(year);
      }
    },
    [onSelectYear]
  );

  // Selected node metadata
  const selectedNode = useMemo(
    () => MATRIX_NODES.find((n) => n.id === activeNodeId) || MATRIX_NODES[0],
    [activeNodeId]
  );

  // Active scenario if any matches current selection
  const activeScenario = useMemo(
    () => MATRIX_SCENARIOS.find((s) => s.focusNodeId === activeNodeId && s.year === activeYear) || null,
    [activeNodeId, activeYear]
  );

  // Connected nodes across all 4 columns for current timeline
  const connectedNodeIds = useMemo(() => {
    return getConnectedNodes(selectedNode.id, activeYear);
  }, [selectedNode.id, activeYear]);

  // Edges active for current year
  const activeEdges = useMemo(
    () => MATRIX_EDGES.filter((edge) => edge.yearValidFrom <= activeYear),
    [activeYear]
  );

  // Connected nodes grouped strictly by column for the primary view
  const connectedByColumn = useMemo(() => {
    const result: Record<MatrixColumn, { node: MatrixNode; roleDa?: string; isSource: boolean }[]> = {
      actors: [],
      events: [],
      systems: [],
      regulations: [],
    };

    for (const id of connectedNodeIds) {
      const node = MATRIX_NODES.find((n) => n.id === id);
      if (!node) continue;

      const isCurrent = node.id === selectedNode.id;

      // Find edge connecting selectedNode and this node if direct
      const directEdge = activeEdges.find(
        (e) =>
          (e.sourceId === selectedNode.id && e.targetId === id) ||
          (e.targetId === selectedNode.id && e.sourceId === id)
      );

      result[node.column].push({
        node,
        roleDa: directEdge?.roleDa,
        isSource: isCurrent,
      });
    }

    return result;
  }, [selectedNode.id, connectedNodeIds, activeEdges]);

  // 2028 Differences for this selected node
  const year2028Changes = useMemo(() => {
    const nodes2026 = getConnectedNodes(selectedNode.id, 2026);
    const nodes2028 = getConnectedNodes(selectedNode.id, 2028);

    const addedNodeIds = Array.from(nodes2028).filter((id) => !nodes2026.has(id));
    return addedNodeIds
      .map((id) => MATRIX_NODES.find((n) => n.id === id))
      .filter((n): n is MatrixNode => Boolean(n));
  }, [selectedNode.id]);

  // Copy memo / factual report
  const handleCopyFacts = () => {
    const lines = [
      `=============================================================`,
      `FISKERISTYRELSEN · KONTROLKÆDE & SAGSNOTAT`,
      `=============================================================`,
      `Element: ${selectedNode.titleDa} [${selectedNode.category}]`,
      selectedNode.subtitleDa ? `Underkategori: ${selectedNode.subtitleDa}` : null,
      selectedNode.legalReference ? `Lovhjemmel: ${selectedNode.legalReference}` : null,
      `Tilsynsperiode: ${activeYear} (${activeYear === 2026 ? "Gældende Ret" : "2028 Målarkitektur"})`,
      `\nForvaltningsbetydning:\n${selectedNode.descriptionDa}`,
      selectedNode.feltkatalogRefs ? `\nFeltkatalog / Bilagsfelter: ${selectedNode.feltkatalogRefs.join(", ")}` : null,
      `\n-------------------------------------------------------------`,
      `Forbundne Krydsfelter i Kontrolkæden (${connectedNodeIds.size} elementer):`,
      `1. Aktører: ${connectedByColumn.actors.map((a) => a.node.titleDa).join(", ")}`,
      `2. Hændelser: ${connectedByColumn.events.map((e) => e.node.titleDa).join(", ")}`,
      `3. IT-Systemer: ${connectedByColumn.systems.map((s) => s.node.titleDa).join(", ")}`,
      `4. Regelsæt: ${connectedByColumn.regulations.map((r) => r.node.titleDa).join(", ")}`,
      `-------------------------------------------------------------`,
      `Dato: ${new Date().toLocaleDateString("da-DK")}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2400);
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("node", selectedNode.id);
    url.searchParams.set("yr", activeYear.toString());
    navigator.clipboard.writeText(url.toString());
    setCopiedLinkNotification(true);
    setTimeout(() => setCopiedLinkNotification(false), 2400);
  };

  // Filtered nodes when in matrix view
  const filteredAllNodes = useMemo(() => {
    if (!searchQuery.trim()) return MATRIX_NODES;
    const q = searchQuery.toLowerCase().trim();
    return MATRIX_NODES.filter(
      (n) =>
        n.titleDa.toLowerCase().includes(q) ||
        (n.subtitleDa && n.subtitleDa.toLowerCase().includes(q)) ||
        (n.legalReference && n.legalReference.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q) ||
        n.descriptionDa.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 font-sans antialiased flex flex-col">
      {/* Clean, Scandinavian Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0e472f] text-white flex items-center justify-center font-bold text-xs">
              FS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                  Fiskeristyrelsen
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-medium text-slate-500">
                  Kontrol & Tilsyn
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Fiskeriets Matrix
              </h1>
            </div>
          </div>

          {/* Simple Timeline Selector & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const found = MATRIX_NODES.find(
                    (n) =>
                      n.titleDa.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      (n.legalReference && n.legalReference.toLowerCase().includes(e.target.value.toLowerCase()))
                  );
                  if (found && e.target.value.trim().length >= 2) {
                    handleSelectNode(found.id);
                  }
                }}
                placeholder="Hurtigsøgning (aktør, art., felt)..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 sm:w-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e472f]"
              />
            </div>

            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center text-xs font-medium">
              <button
                type="button"
                onClick={() => handleSelectYear(2026)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeYear === 2026
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2026: Gældende Ret
              </button>
              <button
                type="button"
                onClick={() => handleSelectYear(2028)}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeYear === 2028
                    ? "bg-[#0e472f] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>2028: Målarkitektur</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    activeYear === 2028 ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  EU-reform
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyFacts}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-800 font-semibold">Kopieret</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kopier til Sagsnotat</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              title="Kopier direkte link"
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              {copiedLinkNotification ? "Link kopieret!" : "Del"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Subheader / Scenarios Strip */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Hurtigvalg:
            </span>
            {MATRIX_SCENARIOS.map((scenario) => {
              const isSelected =
                activeNodeId === scenario.focusNodeId && activeYear === scenario.year;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => {
                    handleSelectYear(scenario.year);
                    handleSelectNode(scenario.focusNodeId);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white font-semibold border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{scenario.titleDa}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {scenario.badgeDa}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Switcher: Kontrolkæde vs Hele Matrixen */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("chain")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === "chain"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Kontrolkæde (Standard)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Alle Elementer ({MATRIX_NODES.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Search bar & Active Element Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0e472f] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedNode.category}
                </span>
                {selectedNode.legalReference && (
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ⚖️ {selectedNode.legalReference}
                  </span>
                )}
                {selectedNode.introducedYear === 2028 && (
                  <span className="text-xs font-mono text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                    Træder i kraft 2028
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedNode.titleDa}</h2>
              {selectedNode.subtitleDa && (
                <p className="text-xs text-slate-500 mt-0.5">{selectedNode.subtitleDa}</p>
              )}
              <p className="text-sm text-slate-700 mt-2 max-w-3xl leading-relaxed">
                {selectedNode.descriptionDa}
              </p>
              {activeScenario && (
                <div className="mt-2.5 text-xs text-[#0e472f] bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 leading-relaxed">
                  <strong>Forvaltnings-kontekst:</strong> {activeScenario.descriptionDa}
                </div>
              )}
            </div>

            {/* Quick selector dropdown */}
            <div className="flex flex-col gap-1.5 shrink-0 w-full sm:w-72">
              <label htmlFor="node-select" className="text-xs font-semibold text-slate-500">
                Skift fokuspunkt:
              </label>
              <select
                id="node-select"
                value={selectedNode.id}
                onChange={(e) => handleSelectNode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e472f]"
              >
                <optgroup label="1. Aktører & Fartøjer">
                  {MATRIX_NODES.filter((n) => n.column === "actors").map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titleDa}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="2. Hændelser i Kæden">
                  {MATRIX_NODES.filter((n) => n.column === "events").map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titleDa}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="3. IT-Systemer & Registre">
                  {MATRIX_NODES.filter((n) => n.column === "systems").map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titleDa}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="4. Regelsæt & Hjemmel">
                  {MATRIX_NODES.filter((n) => n.column === "regulations").map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titleDa}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* 2028 Transformation Notice if relevant */}
          {year2028Changes.length > 0 && activeYear === 2026 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                <strong className="text-slate-800">2028 Udsigt:</strong> For dette element tilføjes{" "}
                <span className="font-semibold text-purple-900">{year2028Changes.length} nye krav</span> i 2028 (bl.a.{" "}
                {year2028Changes.map((n) => n.titleDa).join(", ")}).
              </span>
              <button
                type="button"
                onClick={() => handleSelectYear(2028)}
                className="text-[#0e472f] hover:underline font-semibold text-xs cursor-pointer shrink-0 ml-2"
              >
                Vis 2028 regler →
              </button>
            </div>
          )}
        </div>

        {/* PRIMARY VIEW: Forbundne Krydsfelter i Kontrolkæden */}
        {activeTab === "chain" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#0e472f]" />
                  Forbundne Krydsfelter i Kontrolkæden
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Relevante aktører, forvaltningshændelser, IT-systemer og lovhjemmel forbundet med det valgte element.
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {connectedNodeIds.size} forbundne elementer
              </span>
            </div>

            {/* The 4 Lanes / Columns of Connected Elements */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Aktører */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col space-y-3">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Aktør / Fartøjsklasse
                  </h4>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {connectedByColumn.actors.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {connectedByColumn.actors.map(({ node, roleDa, isSource }) => (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSource
                          ? "bg-emerald-50/80 border-[#0e472f] shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {node.category}
                        </span>
                        {isSource && (
                          <span className="text-[9px] font-bold text-[#0e472f] bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                            Fokus
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">{node.titleDa}</div>
                      {node.subtitleDa && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {node.subtitleDa}
                        </div>
                      )}
                      {roleDa && (
                        <div className="mt-2 pt-1 border-t border-slate-200 text-[10px] text-emerald-800 font-medium">
                          → {roleDa}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Hændelser */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col space-y-3">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Operationel Hændelse
                  </h4>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {connectedByColumn.events.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {connectedByColumn.events.map(({ node, roleDa, isSource }) => (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSource
                          ? "bg-emerald-50/80 border-[#0e472f] shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {node.category}
                        </span>
                        {isSource && (
                          <span className="text-[9px] font-bold text-[#0e472f] bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                            Fokus
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">{node.titleDa}</div>
                      {node.subtitleDa && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {node.subtitleDa}
                        </div>
                      )}
                      {roleDa && (
                        <div className="mt-2 pt-1 border-t border-slate-200 text-[10px] text-emerald-800 font-medium">
                          → {roleDa}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: IT-Systemer */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col space-y-3">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. IT-System & Datastrøm
                  </h4>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {connectedByColumn.systems.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {connectedByColumn.systems.map(({ node, roleDa, isSource }) => (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSource
                          ? "bg-emerald-50/80 border-[#0e472f] shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {node.category}
                        </span>
                        {isSource && (
                          <span className="text-[9px] font-bold text-[#0e472f] bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                            Fokus
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">{node.titleDa}</div>
                      {node.subtitleDa && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {node.subtitleDa}
                        </div>
                      )}
                      {roleDa && (
                        <div className="mt-2 pt-1 border-t border-slate-200 text-[10px] text-emerald-800 font-medium">
                          → {roleDa}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 4: Regelsæt & Hjemmel */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col space-y-3">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    4. Regelsæt & Hjemmel
                  </h4>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {connectedByColumn.regulations.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {connectedByColumn.regulations.map(({ node, roleDa, isSource }) => (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSource
                          ? "bg-emerald-50/80 border-[#0e472f] shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {node.category}
                        </span>
                        {isSource && (
                          <span className="text-[9px] font-bold text-[#0e472f] bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                            Fokus
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">{node.titleDa}</div>
                      {node.legalReference && (
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          ⚖️ {node.legalReference}
                        </div>
                      )}
                      {roleDa && (
                        <div className="mt-2 pt-1 border-t border-slate-200 text-[10px] text-emerald-800 font-medium">
                          → {roleDa}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Administrative Field Catalog References */}
            {selectedNode.feltkatalogRefs && selectedNode.feltkatalogRefs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0e472f]" />
                  Feltkatalog & Datastandarder (Teknisk specifikation)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.feltkatalogRefs.map((ref, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-800 font-medium"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALTERNATIVE VIEW: All 38 Nodes in searchable table */}
        {activeTab === "matrix" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-bold text-slate-900">
                Samlet Katalog over alle 38 Domæneelementer
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hurtigsøgning..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Element / Titel</th>
                    <th className="p-3">Søjle</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Lovhjemmel</th>
                    <th className="p-3">Tidslinje</th>
                    <th className="p-3 text-right">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllNodes.map((node) => (
                    <tr
                      key={node.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedNode.id === node.id ? "bg-emerald-50/50 font-medium" : ""
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-900">
                        {node.titleDa}
                        {node.subtitleDa && (
                          <div className="text-[11px] font-normal text-slate-500">{node.subtitleDa}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {node.column === "actors" && "1. Aktør"}
                        {node.column === "events" && "2. Hændelse"}
                        {node.column === "systems" && "3. IT-System"}
                        {node.column === "regulations" && "4. Regelsæt"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700">
                          {node.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{node.legalReference || "—"}</td>
                      <td className="p-3">
                        {node.introducedYear === 2028 ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-semibold text-[10px]">
                            2028
                          </span>
                        ) : (
                          <span className="text-slate-400">2026</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectNode(node.id);
                            setActiveTab("chain");
                          }}
                          className="text-[#0e472f] hover:underline font-semibold cursor-pointer"
                        >
                          Vis Kæde →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Fiskeristyrelsen</strong> · Styrelsen for Fødevarer, Landbrug og Fiskeri
          </div>
          <div>
            Retsgrundlag: (EU) 1224/2009, (EU) 2023/2842, (EU) 2025/2196, BEK 1144/2025, BEK 1197/2025
          </div>
        </div>
      </footer>
    </div>
  );
}
