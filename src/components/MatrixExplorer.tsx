"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Anchor,
  Ship,
  Camera,
  Scale,
  Cpu,
  Sparkles,
  Search,
  Share2,
  Copy,
  Check,
  Moon,
  Sun,
  X,
  FileText,
  Shield,
  Layers,
  Info,
  Compass,
} from "lucide-react";
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MATRIX_COLUMNS,
  MatrixNode,
  MatrixColumn,
  TimelineYear,
  getConnectedNodes,
} from "../lib/matrixData";
import { MATRIX_SCENARIOS, MatrixScenario } from "../lib/matrixScenarios";

interface MatrixExplorerProps {
  selectedNodeId?: string | null;
  selectedYear?: TimelineYear;
  onSelectNode?: (nodeId: string | null) => void;
  onSelectYear?: (year: TimelineYear) => void;
}

interface SynapseCurve {
  id: string;
  sourceId: string;
  targetId: string;
  path: string;
  roleDa: string;
  isDirect: boolean;
}

export function MatrixExplorer({
  selectedNodeId: propSelectedNodeId,
  selectedYear: propSelectedYear = 2026,
  onSelectNode,
  onSelectYear,
}: MatrixExplorerProps) {
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const [internalYear, setInternalYear] = useState<TimelineYear>(propSelectedYear);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [copiedLinkNotification, setCopiedLinkNotification] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [synapseCurves, setSynapseCurves] = useState<SynapseCurve[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const activeNodeId = propSelectedNodeId !== undefined ? propSelectedNodeId : internalSelectedNodeId;
  const activeYear = propSelectedYear !== undefined ? propSelectedYear : internalYear;

  const handleSelectNode = useCallback((id: string | null) => {
    if (onSelectNode) {
      onSelectNode(id);
    } else {
      setInternalSelectedNodeId(id);
    }
  }, [onSelectNode]);

  const handleSelectYear = useCallback((year: TimelineYear) => {
    if (onSelectYear) {
      onSelectYear(year);
    } else {
      setInternalYear(year);
    }
  }, [onSelectYear]);

  // Selected node metadata
  const selectedNode = useMemo(
    () => (activeNodeId ? MATRIX_NODES.find((n) => n.id === activeNodeId) || null : null),
    [activeNodeId]
  );

  // Active scenario if any matches current selection
  const activeScenario = useMemo(
    () => MATRIX_SCENARIOS.find((s) => s.focusNodeId === activeNodeId && s.year === activeYear) || null,
    [activeNodeId, activeYear]
  );

  // Connected nodes across all 4 columns for current timeline
  const connectedNodeIds = useMemo(() => {
    const target = activeNodeId || hoveredNodeId;
    if (!target) return new Set<string>();
    return getConnectedNodes(target, activeYear);
  }, [activeNodeId, hoveredNodeId, activeYear]);

  // Edges active for current year
  const activeEdges = useMemo(
    () => MATRIX_EDGES.filter((edge) => edge.yearValidFrom <= activeYear),
    [activeYear]
  );

  // Group nodes by column
  const nodesByColumn = useMemo(() => {
    const groups: Record<MatrixColumn, MatrixNode[]> = {
      actors: [],
      events: [],
      systems: [],
      regulations: [],
    };
    for (const node of MATRIX_NODES) {
      groups[node.column].push(node);
    }
    return groups;
  }, []);

  // Filtered nodes per column based on search
  const filteredNodesByColumn = useMemo(() => {
    if (!searchQuery.trim()) return nodesByColumn;
    const q = searchQuery.toLowerCase().trim();
    const filtered: Record<MatrixColumn, MatrixNode[]> = {
      actors: [],
      events: [],
      systems: [],
      regulations: [],
    };
    for (const col of ['actors', 'events', 'systems', 'regulations'] as MatrixColumn[]) {
      filtered[col] = nodesByColumn[col].filter(
        (n) =>
          n.titleDa.toLowerCase().includes(q) ||
          (n.subtitleDa && n.subtitleDa.toLowerCase().includes(q)) ||
          (n.legalReference && n.legalReference.toLowerCase().includes(q)) ||
          n.category.toLowerCase().includes(q) ||
          n.descriptionDa.toLowerCase().includes(q) ||
          (n.feltkatalogRefs && n.feltkatalogRefs.some((r) => r.toLowerCase().includes(q)))
      );
    }
    return filtered;
  }, [nodesByColumn, searchQuery]);

  // Connected nodes grouped by column for the dossier
  const connectedByColumn = useMemo(() => {
    if (!activeNodeId) return null;
    const result: Record<MatrixColumn, { node: MatrixNode; roleDa?: string }[]> = {
      actors: [],
      events: [],
      systems: [],
      regulations: [],
    };

    for (const id of connectedNodeIds) {
      if (id === activeNodeId) continue;
      const node = MATRIX_NODES.find((n) => n.id === id);
      if (!node) continue;

      const directEdge = activeEdges.find(
        (e) =>
          (e.sourceId === activeNodeId && e.targetId === id) ||
          (e.targetId === activeNodeId && e.sourceId === id)
      );

      result[node.column].push({ node, roleDa: directEdge?.roleDa });
    }

    return result;
  }, [activeNodeId, connectedNodeIds, activeEdges]);

  // Re-calculate SVG synapse paths between active cards
  const calculateSynapses = useCallback(() => {
    const focusId = activeNodeId || hoveredNodeId;
    if (!focusId || !gridRef.current) {
      setSynapseCurves([]);
      return;
    }

    const gridRect = gridRef.current.getBoundingClientRect();
    const relevantEdges = activeEdges.filter(
      (e) =>
        (e.sourceId === focusId || e.targetId === focusId) ||
        (connectedNodeIds.has(e.sourceId) && connectedNodeIds.has(e.targetId))
    );

    const curves: SynapseCurve[] = [];

    for (const edge of relevantEdges) {
      const srcEl = document.getElementById(`matrix-card-${edge.sourceId}`);
      const tgtEl = document.getElementById(`matrix-card-${edge.targetId}`);
      if (!srcEl || !tgtEl) continue;

      const srcRect = srcEl.getBoundingClientRect();
      const tgtRect = tgtEl.getBoundingClientRect();

      // Determine left-to-right flow based on screen X
      let startX: number;
      let startY: number;
      let endX: number;
      let endY: number;

      if (srcRect.left <= tgtRect.left) {
        startX = srcRect.right - gridRect.left;
        startY = srcRect.top + srcRect.height / 2 - gridRect.top;
        endX = tgtRect.left - gridRect.left;
        endY = tgtRect.top + tgtRect.height / 2 - gridRect.top;
      } else {
        startX = srcRect.left - gridRect.left;
        startY = srcRect.top + srcRect.height / 2 - gridRect.top;
        endX = tgtRect.right - gridRect.left;
        endY = tgtRect.top + tgtRect.height / 2 - gridRect.top;
      }

      const dx = Math.abs(endX - startX);
      const curvature = Math.max(30, dx * 0.45);
      const isDirect = edge.sourceId === focusId || edge.targetId === focusId;

      const path = `M ${startX} ${startY} C ${startX + (endX > startX ? curvature : -curvature)} ${startY}, ${
        endX + (endX > startX ? -curvature : curvature)
      } ${endY}, ${endX} ${endY}`;

      curves.push({
        id: `${edge.sourceId}-${edge.targetId}`,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        path,
        roleDa: edge.roleDa,
        isDirect,
      });
    }

    setSynapseCurves(curves);
  }, [activeNodeId, hoveredNodeId, activeEdges, connectedNodeIds]);

  useEffect(() => {
    calculateSynapses();
    window.addEventListener("resize", calculateSynapses);
    return () => window.removeEventListener("resize", calculateSynapses);
  }, [calculateSynapses]);

  // Scenario quick activator
  const activateScenario = (scenario: MatrixScenario) => {
    handleSelectYear(scenario.year);
    handleSelectNode(scenario.focusNodeId);
  };

  // Copy memo / factual report
  const handleCopyFacts = () => {
    if (!selectedNode) return;
    const lines = [
      `=============================================================`,
      `FISKERISTYRELSEN · SAGSNOTAT & KRYDSFELTS-ANALYSE`,
      `=============================================================`,
      `Fokus: ${selectedNode.titleDa} [${selectedNode.category}]`,
      selectedNode.subtitleDa ? `Underkategori: ${selectedNode.subtitleDa}` : null,
      selectedNode.legalReference ? `Hjemmel: ${selectedNode.legalReference}` : null,
      `Tidslinje: ${activeYear} (${activeYear === 2026 ? "Gældende Ret" : "2028 Målarkitektur"})`,
      `Forvaltningsbetydning:\n${selectedNode.descriptionDa}`,
      selectedNode.feltkatalogRefs ? `Feltkatalog / Bilag: ${selectedNode.feltkatalogRefs.join(", ")}` : null,
      activeScenario ? `\nScenarie-kontekst:\n${activeScenario.descriptionDa}` : null,
      `-------------------------------------------------------------`,
      `Aktivt forbundne elementer (${connectedNodeIds.size - 1} enheder på tværs af kæden)`,
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
    if (activeNodeId) url.searchParams.set("node", activeNodeId);
    url.searchParams.set("yr", activeYear.toString());
    navigator.clipboard.writeText(url.toString());
    setCopiedLinkNotification(true);
    setTimeout(() => setCopiedLinkNotification(false), 2400);
  };

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case "Anchor":
        return <Anchor className="w-3.5 h-3.5" />;
      case "Ship":
        return <Ship className="w-3.5 h-3.5" />;
      case "Camera":
        return <Camera className="w-3.5 h-3.5" />;
      case "Scale":
        return <Scale className="w-3.5 h-3.5" />;
      case "Cpu":
        return <Cpu className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen w-full transition-colors duration-300 font-sans ${
        isDark
          ? "bg-[#070d0a] text-emerald-50 selection:bg-emerald-500/30 selection:text-emerald-200"
          : "bg-[#f8faf8] text-slate-900 selection:bg-emerald-200 selection:text-emerald-950"
      }`}
    >
      <style jsx global>{`
        @keyframes flowPulse {
          0% {
            stroke-dashoffset: 28;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .synapse-flowing {
          animation: flowPulse 1.2s linear infinite;
        }
      `}</style>

      {/* Top Executive Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-3.5 transition-colors ${
          isDark
            ? "bg-[#0a1410]/90 border-emerald-900/40 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            : "bg-white/90 border-slate-200 shadow-xs"
        }`}
      >
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold tracking-tighter text-sm transition-all shadow-md ${
                isDark
                  ? "bg-gradient-to-br from-emerald-600 to-teal-800 text-white ring-1 ring-emerald-400/30"
                  : "bg-[#0e472f] text-white"
              }`}
            >
              FS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    isDark
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  Miljøministeriet · Fiskeristyrelsen
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    isDark ? "text-emerald-400/80" : "text-slate-500"
                  }`}
                >
                  38 noder • 84 krydsfelter
                </span>
              </div>
              <h1
                className={`text-lg font-bold tracking-tight mt-0.5 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Fiskeriets Matrix{" "}
                <span className="font-normal text-emerald-500 text-sm">
                  (360° Krydsfelts-Explorer & Tilsynskæde)
                </span>
              </h1>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                  isDark ? "text-emerald-500/70" : "text-slate-400"
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hurtigsøgning (aktør, art., felt)..."
                className={`pl-8 pr-7 py-1.5 rounded-lg text-xs font-medium w-48 sm:w-64 transition-all focus:outline-none focus:ring-2 ${
                  isDark
                    ? "bg-[#0f1d18] border border-emerald-800/60 text-emerald-100 placeholder-emerald-700 focus:ring-emerald-500/50"
                    : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-emerald-600"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Timeline Year Toggle */}
            <div
              className={`p-0.5 rounded-xl border flex items-center text-xs font-semibold ${
                isDark
                  ? "bg-[#0b1612] border-emerald-900/60"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectYear(2026)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeYear === 2026
                    ? isDark
                      ? "bg-emerald-600 text-white shadow-md font-bold"
                      : "bg-white text-slate-900 shadow-xs font-bold"
                    : isDark
                    ? "text-emerald-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2026: Gældende Ret
              </button>
              <button
                type="button"
                onClick={() => handleSelectYear(2028)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeYear === 2028
                    ? isDark
                      ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md font-bold"
                      : "bg-purple-900 text-purple-50 shadow-xs font-bold"
                    : isDark
                    ? "text-purple-400 hover:text-purple-200"
                    : "text-purple-700 hover:text-purple-950"
                }`}
              >
                <span>2028: Målarkitektur</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                    activeYear === 2028
                      ? "bg-white/20 text-white"
                      : isDark
                      ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  EU-reform
                </span>
              </button>
            </div>

            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Kopiér direkte link"
              className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                isDark
                  ? "bg-[#0f1d18] border-emerald-900/60 text-emerald-300 hover:bg-emerald-900/40 hover:text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {copiedLinkNotification ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? "Skift til lyst tema" : "Skift til mørkt tema"}
              className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                isDark
                  ? "bg-[#0f1d18] border-emerald-900/60 text-amber-300 hover:bg-emerald-900/40"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Quick Scenario Selector Bar ("Forvaltnings-Scenarier") */}
      <section
        className={`border-b px-6 py-2.5 transition-colors ${
          isDark
            ? "bg-[#0a120f] border-emerald-900/40 text-xs"
            : "bg-emerald-50/50 border-emerald-100 text-xs"
        }`}
      >
        <div className="max-w-[1780px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-semibold tracking-wide uppercase text-[11px] flex items-center gap-1.5 ${
                isDark ? "text-emerald-400" : "text-emerald-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              Forvaltnings-Scenarier:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-wrap">
            {MATRIX_SCENARIOS.map((scenario) => {
              const isSelected =
                activeNodeId === scenario.focusNodeId && activeYear === scenario.year;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => activateScenario(scenario)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isSelected
                      ? isDark
                        ? "bg-emerald-500 text-slate-950 font-bold border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : "bg-emerald-800 text-white font-bold border-emerald-900 shadow-sm"
                      : isDark
                      ? "bg-[#0e1a15] text-emerald-200 border-emerald-800/40 hover:border-emerald-500 hover:text-white"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:text-emerald-900"
                  }`}
                >
                  <span className={isSelected ? "text-slate-950" : isDark ? "text-emerald-400" : "text-emerald-700"}>
                    {getScenarioIcon(scenario.icon)}
                  </span>
                  <span>{scenario.titleDa}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950 font-bold"
                        : isDark
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {scenario.badgeDa}
                  </span>
                </button>
              );
            })}

            {activeNodeId && (
              <button
                type="button"
                onClick={() => handleSelectNode(null)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? "bg-red-950/40 text-red-300 border-red-800/50 hover:bg-red-900/60"
                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                }`}
              >
                ✕ Nulstil Valg
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Narrative Storyboard Ribbon (Shows Current Path & Rationale) */}
      <section
        className={`px-6 py-3 border-b transition-all ${
          isDark
            ? "bg-[#060b09] border-emerald-900/30 text-xs"
            : "bg-white border-slate-200 text-xs"
        }`}
      >
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            {selectedNode ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      isDark
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Aktiv Kæde
                  </span>
                  <strong className={isDark ? "text-emerald-300 text-sm" : "text-emerald-950 text-sm"}>
                    {selectedNode.titleDa}
                  </strong>
                  {selectedNode.legalReference && (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        isDark ? "bg-[#11221b] text-emerald-300" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      ⚖️ {selectedNode.legalReference}
                    </span>
                  )}
                </div>

                <div
                  className={`text-xs flex-1 line-clamp-2 sm:line-clamp-1 ${
                    isDark ? "text-emerald-200/80" : "text-slate-600"
                  }`}
                >
                  {activeScenario ? (
                    <span>
                      <strong className={isDark ? "text-white" : "text-slate-900"}>Forløb:</strong>{" "}
                      {activeScenario.narrativeDa} — {activeScenario.descriptionDa}
                    </span>
                  ) : (
                    <span>{selectedNode.descriptionDa}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400/80">
                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className={isDark ? "text-emerald-300/80" : "text-slate-600"}>
                  <strong>Vejledning:</strong> Vælg et scenarie foroven eller klik på et vilkårligt kort herunder for at
                  aktivere de levende synapser og belyse den samlede tilsynskæde.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-[11px] font-mono ${
                isDark ? "text-emerald-400/70" : "text-slate-500"
              }`}
            >
              {activeYear === 2026 ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Gældende 2026 Kontrolregler
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  2028 Målarkitektur (EU 2023/2842)
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Main 4-Column Canvas with Interactive Synapse Overlay */}
      <main className="max-w-[1780px] mx-auto px-6 py-6 relative">
        <div ref={gridRef} className="relative min-h-[600px]">
          {/* Glowing Synapse SVG Connection Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="synapseGlow2026" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
              </linearGradient>

              <linearGradient id="synapseGlow2028" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.85" />
              </linearGradient>

              <filter id="synapseFilterGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {synapseCurves.map((curve) => (
              <g key={curve.id}>
                {/* Background glow halo */}
                <path
                  d={curve.path}
                  fill="none"
                  stroke={activeYear === 2028 ? "#a855f7" : "#10b981"}
                  strokeWidth={curve.isDirect ? 6 : 3}
                  strokeOpacity={isDark ? (curve.isDirect ? 0.35 : 0.15) : (curve.isDirect ? 0.2 : 0.08)}
                  filter="url(#synapseFilterGlow)"
                />

                {/* Main animated pulsing line */}
                <path
                  d={curve.path}
                  fill="none"
                  stroke={
                    activeYear === 2028
                      ? "url(#synapseGlow2028)"
                      : "url(#synapseGlow2026)"
                  }
                  strokeWidth={curve.isDirect ? 2.5 : 1.5}
                  strokeDasharray="8 6"
                  className="synapse-flowing"
                />
              </g>
            ))}
          </svg>

          {/* 4 Interactive Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 relative z-20">
            {MATRIX_COLUMNS.map((col) => {
              const nodes = filteredNodesByColumn[col.id];
              return (
                <div
                  key={col.id}
                  className={`rounded-2xl p-4 border transition-colors flex flex-col ${
                    isDark
                      ? "bg-[#0b1410]/70 border-emerald-950/80 backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
                      : "bg-slate-50/80 border-slate-200/90 shadow-sm"
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`pb-3 mb-3 border-b flex items-start justify-between gap-2 ${
                      isDark ? "border-emerald-900/40" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <h2
                        className={`text-sm font-bold tracking-tight ${
                          isDark ? "text-emerald-100" : "text-slate-900"
                        }`}
                      >
                        {col.titleDa}
                      </h2>
                      <p
                        className={`text-[11px] line-clamp-1 mt-0.5 ${
                          isDark ? "text-emerald-400/60" : "text-slate-500"
                        }`}
                      >
                        {col.descriptionDa}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isDark
                          ? "bg-[#0f2119] text-emerald-400 border border-emerald-800/60"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      {nodes.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                    {nodes.map((node) => {
                      const isSelected = activeNodeId === node.id;
                      const isConnected = activeNodeId ? connectedNodeIds.has(node.id) : false;
                      const isDimmed = activeNodeId ? !isConnected : false;
                      const is2028Only = node.introducedYear === 2028;

                      return (
                        <div
                          key={node.id}
                          id={`matrix-card-${node.id}`}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onClick={() => handleSelectNode(isSelected ? null : node.id)}
                          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative group text-left ${
                            isSelected
                              ? isDark
                                ? "bg-emerald-950/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400"
                                : "bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                              : isConnected
                              ? isDark
                                ? "bg-[#0e2119] border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                : "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-200"
                              : isDimmed
                              ? "opacity-20 hover:opacity-75 grayscale hover:grayscale-0 border-transparent bg-black/10"
                              : isDark
                              ? "bg-[#0e1a14] border-emerald-900/40 hover:border-emerald-600/80 hover:bg-[#12221b] hover:shadow-md"
                              : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                          }`}
                        >
                          {/* Card Top Category & 2028 Badges */}
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isSelected
                                  ? isDark
                                    ? "bg-emerald-400 text-slate-950 font-bold border-emerald-300"
                                    : "bg-emerald-700 text-white font-bold border-emerald-800"
                                  : isConnected
                                  ? isDark
                                    ? "bg-emerald-900/80 text-emerald-200 border-emerald-700"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : isDark
                                  ? "bg-[#14281f] text-emerald-300 border-emerald-800/40"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {node.category}
                            </span>

                            {is2028Only && (
                              <span
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                  activeYear === 2028
                                    ? isDark
                                      ? "bg-purple-900/90 text-purple-200 border-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                      : "bg-purple-100 text-purple-900 border-purple-300 font-bold"
                                    : isDark
                                    ? "bg-slate-900/60 text-slate-500 border-slate-800"
                                    : "bg-slate-100 text-slate-400 border-slate-200"
                                }`}
                              >
                                2028 Krav
                              </span>
                            )}
                          </div>

                          {/* Card Title */}
                          <h3
                            className={`text-xs font-bold leading-snug tracking-tight ${
                              isSelected
                                ? isDark
                                  ? "text-white font-extrabold"
                                  : "text-emerald-950 font-extrabold"
                                : isDark
                                ? "text-emerald-50 group-hover:text-emerald-300"
                                : "text-slate-900 group-hover:text-emerald-900"
                            }`}
                          >
                            {node.titleDa}
                          </h3>

                          {/* Subtitle */}
                          {node.subtitleDa && (
                            <p
                              className={`text-[11px] mt-0.5 line-clamp-1 ${
                                isDark ? "text-emerald-400/60" : "text-slate-500"
                              }`}
                            >
                              {node.subtitleDa}
                            </p>
                          )}

                          {/* Legal Reference Pin */}
                          {node.legalReference && (
                            <div
                              className={`mt-2 pt-1.5 border-t text-[10px] font-mono flex items-center justify-between ${
                                isDark ? "border-emerald-900/40 text-emerald-400/80" : "border-slate-100 text-slate-500"
                              }`}
                            >
                              <span className="truncate">⚖️ {node.legalReference}</span>
                              {isConnected && !isSelected && (
                                <span className="font-sans font-bold text-emerald-400 text-[10px] shrink-0 ml-1">
                                  ✓ Forbundet
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive Dossier Drawer / Sagsbehandler Fakta-Panel */}
        {selectedNode && (
          <div
            className={`mt-8 rounded-2xl border p-6 transition-all duration-300 shadow-2xl ${
              isDark
                ? "bg-[#08130e] border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                : "bg-white border-emerald-600 shadow-xl ring-2 ring-emerald-600/20"
            }`}
          >
            {/* Header with Title & Action Buttons */}
            <div
              className={`flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b ${
                isDark ? "border-emerald-900/60" : "border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isDark
                        ? "bg-emerald-500 text-slate-950 border-emerald-300"
                        : "bg-emerald-800 text-white border-emerald-900"
                    }`}
                  >
                    {selectedNode.category}
                  </span>

                  {selectedNode.legalReference && (
                    <span
                      className={`text-xs font-mono px-2.5 py-0.5 rounded border ${
                        isDark
                          ? "bg-[#0e2119] text-emerald-300 border-emerald-700/60"
                          : "bg-slate-100 text-slate-800 border-slate-200 font-semibold"
                      }`}
                    >
                      ⚖️ Lovhjemmel: {selectedNode.legalReference}
                    </span>
                  )}

                  {selectedNode.introducedYear === 2028 && (
                    <span
                      className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold uppercase border ${
                        isDark
                          ? "bg-purple-950 text-purple-300 border-purple-700"
                          : "bg-purple-100 text-purple-900 border-purple-300"
                      }`}
                    >
                      ✨ Træder i kraft 10. januar 2028 (EU 2023/2842)
                    </span>
                  )}
                </div>

                <h3
                  className={`text-2xl font-bold tracking-tight mt-2 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {selectedNode.titleDa}
                </h3>
                {selectedNode.subtitleDa && (
                  <p
                    className={`text-sm mt-0.5 font-medium ${
                      isDark ? "text-emerald-300/80" : "text-slate-600"
                    }`}
                  >
                    {selectedNode.subtitleDa}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFacts}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    isDark
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      : "bg-emerald-800 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>✓ Kopieret til Sagsnotat!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Kopier til Sagsnotat</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectNode(null)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#0e2119] border-emerald-800/60 text-emerald-400 hover:text-white"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                  title="Luk dossier (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dossier Body: Narrative & Connected Entities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Left 1 Column: Legal Basis & Field Catalog */}
              <div
                className={`p-5 rounded-xl border flex flex-col gap-4 ${
                  isDark ? "bg-[#091610] border-emerald-900/50" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                      isDark ? "text-emerald-400" : "text-emerald-900"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Forvaltningsbetydning
                  </h4>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? "text-emerald-100" : "text-slate-700"
                    }`}
                  >
                    {selectedNode.descriptionDa}
                  </p>
                </div>

                {selectedNode.feltkatalogRefs && selectedNode.feltkatalogRefs.length > 0 && (
                  <div className="pt-3 border-t border-emerald-900/30">
                    <h4
                      className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                        isDark ? "text-emerald-400" : "text-emerald-900"
                      }`}
                    >
                      <Layers className="w-4 h-4" /> Feltkatalog & Datastandard
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.feltkatalogRefs.map((ref, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
                            isDark
                              ? "bg-[#0f251c] text-emerald-300 border-emerald-700/60"
                              : "bg-white text-slate-800 border-slate-300 font-medium"
                          }`}
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 2 Columns: Connected Entities Across the 4 Domains */}
              <div className="lg:col-span-2">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between ${
                    isDark ? "text-emerald-400" : "text-emerald-900"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Forbundne Krydsfelter i Kontrolkæden
                  </span>
                  <span className="text-[11px] font-mono normal-case">
                    {connectedNodeIds.size - 1} direkte & transitive relationer
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {connectedByColumn && (
                    <>
                      {/* Actors Group */}
                      {connectedByColumn.actors.length > 0 && (
                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? "bg-[#091510] border-emerald-900/40" : "bg-white border-slate-200"
                          }`}
                        >
                          <div
                            className={`text-xs font-bold pb-2 mb-2 border-b flex items-center justify-between ${
                              isDark ? "border-emerald-900/40 text-emerald-300" : "border-slate-100 text-slate-800"
                            }`}
                          >
                            <span>1. Involverede Aktører</span>
                            <span className="font-mono text-[10px] opacity-75">
                              ({connectedByColumn.actors.length})
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {connectedByColumn.actors.map(({ node, roleDa }) => (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSelectNode(node.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isDark
                                    ? "bg-[#0d1e16] hover:bg-emerald-900/50 text-emerald-100"
                                    : "bg-slate-50 hover:bg-emerald-50 text-slate-800"
                                }`}
                              >
                                <span className="font-medium truncate">{node.titleDa}</span>
                                {roleDa && (
                                  <span className="text-[10px] text-emerald-500 shrink-0 ml-2 font-mono">
                                    → {roleDa}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Events Group */}
                      {connectedByColumn.events.length > 0 && (
                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? "bg-[#091510] border-emerald-900/40" : "bg-white border-slate-200"
                          }`}
                        >
                          <div
                            className={`text-xs font-bold pb-2 mb-2 border-b flex items-center justify-between ${
                              isDark ? "border-emerald-900/40 text-emerald-300" : "border-slate-100 text-slate-800"
                            }`}
                          >
                            <span>2. Forvaltningshændelser</span>
                            <span className="font-mono text-[10px] opacity-75">
                              ({connectedByColumn.events.length})
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {connectedByColumn.events.map(({ node, roleDa }) => (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSelectNode(node.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isDark
                                    ? "bg-[#0d1e16] hover:bg-emerald-900/50 text-emerald-100"
                                    : "bg-slate-50 hover:bg-emerald-50 text-slate-800"
                                }`}
                              >
                                <span className="font-medium truncate">{node.titleDa}</span>
                                {roleDa && (
                                  <span className="text-[10px] text-emerald-500 shrink-0 ml-2 font-mono">
                                    → {roleDa}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Systems Group */}
                      {connectedByColumn.systems.length > 0 && (
                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? "bg-[#091510] border-emerald-900/40" : "bg-white border-slate-200"
                          }`}
                        >
                          <div
                            className={`text-xs font-bold pb-2 mb-2 border-b flex items-center justify-between ${
                              isDark ? "border-emerald-900/40 text-emerald-300" : "border-slate-100 text-slate-800"
                            }`}
                          >
                            <span>3. IT-Systemer & Registre</span>
                            <span className="font-mono text-[10px] opacity-75">
                              ({connectedByColumn.systems.length})
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {connectedByColumn.systems.map(({ node, roleDa }) => (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSelectNode(node.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isDark
                                    ? "bg-[#0d1e16] hover:bg-emerald-900/50 text-emerald-100"
                                    : "bg-slate-50 hover:bg-emerald-50 text-slate-800"
                                }`}
                              >
                                <span className="font-medium truncate">{node.titleDa}</span>
                                {roleDa && (
                                  <span className="text-[10px] text-emerald-500 shrink-0 ml-2 font-mono">
                                    → {roleDa}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Regulations Group */}
                      {connectedByColumn.regulations.length > 0 && (
                        <div
                          className={`p-3 rounded-xl border ${
                            isDark ? "bg-[#091510] border-emerald-900/40" : "bg-white border-slate-200"
                          }`}
                        >
                          <div
                            className={`text-xs font-bold pb-2 mb-2 border-b flex items-center justify-between ${
                              isDark ? "border-emerald-900/40 text-emerald-300" : "border-slate-100 text-slate-800"
                            }`}
                          >
                            <span>4. Regelsæt & Retskilder</span>
                            <span className="font-mono text-[10px] opacity-75">
                              ({connectedByColumn.regulations.length})
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {connectedByColumn.regulations.map(({ node, roleDa }) => (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSelectNode(node.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isDark
                                    ? "bg-[#0d1e16] hover:bg-emerald-900/50 text-emerald-100"
                                    : "bg-slate-50 hover:bg-emerald-50 text-slate-800"
                                }`}
                              >
                                <span className="font-medium truncate">{node.titleDa}</span>
                                {roleDa && (
                                  <span className="text-[10px] text-emerald-500 shrink-0 ml-2 font-mono">
                                    → {roleDa}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
