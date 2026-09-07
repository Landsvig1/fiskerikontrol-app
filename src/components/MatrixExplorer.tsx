"use client";

import React, { useState, useMemo } from "react";
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MATRIX_COLUMNS,
  MatrixNode,
  MatrixColumn,
  TimelineYear,
  getConnectedNodes,
} from "../lib/matrixData";

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
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const [internalYear, setInternalYear] = useState<TimelineYear>(propSelectedYear);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const activeNodeId = propSelectedNodeId !== undefined ? propSelectedNodeId : internalSelectedNodeId;
  const activeYear = propSelectedYear !== undefined ? propSelectedYear : internalYear;

  const handleSelectNode = (id: string | null) => {
    if (onSelectNode) {
      onSelectNode(id);
    } else {
      setInternalSelectedNodeId(id);
    }
  };

  const handleSelectYear = (year: TimelineYear) => {
    if (onSelectYear) {
      onSelectYear(year);
    } else {
      setInternalYear(year);
    }
  };

  const selectedNode = useMemo(
    () => (activeNodeId ? MATRIX_NODES.find((n) => n.id === activeNodeId) || null : null),
    [activeNodeId]
  );

  const connectedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    return getConnectedNodes(activeNodeId, activeYear);
  }, [activeNodeId, activeYear]);

  // Edges active for this year
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

  // Connected nodes grouped by column for the facts drawer
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

      // Find edge role if direct
      const directEdge = activeEdges.find(
        (e) =>
          (e.sourceId === activeNodeId && e.targetId === id) ||
          (e.targetId === activeNodeId && e.sourceId === id)
      );

      result[node.column].push({ node, roleDa: directEdge?.roleDa });
    }

    return result;
  }, [activeNodeId, connectedNodeIds, activeEdges]);

  const handleCopyFacts = () => {
    if (!selectedNode) return;
    const text = [
      `Fiskeriets Matrix: ${selectedNode.titleDa} (${selectedNode.category})`,
      selectedNode.subtitleDa ? `Underkategori: ${selectedNode.subtitleDa}` : "",
      selectedNode.legalReference ? `Hjemmel: ${selectedNode.legalReference}` : "",
      `Beskrivelse: ${selectedNode.descriptionDa}`,
      selectedNode.feltkatalogRefs ? `Feltkatalog: ${selectedNode.feltkatalogRefs.join(", ")}` : "",
      `Aktivt år: ${activeYear}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Flerdimensionelt Overblik
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {MATRIX_NODES.length} noder • {activeEdges.length} relationer
              </span>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-slate-900 mt-1">
              Fiskeriets Matrix (360° Krydsfelts-Explorer)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Udforsk hvordan fartøjer, forvaltningshændelser, IT-systemer og lovhjemmel griber ind i hinanden.
              Klik på en vilkårlig brik for at belyse hele dens relationelle kæde.
            </p>
          </div>

          {/* Timeline Switcher & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-sm">
              <button
                type="button"
                onClick={() => handleSelectYear(2026)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeYear === 2026
                    ? "bg-white text-emerald-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2026: Gældende Regler
              </button>
              <button
                type="button"
                onClick={() => handleSelectYear(2028)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeYear === 2028
                    ? "bg-purple-900 text-purple-50 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-purple-900"
                }`}
              >
                <span>2028: Fuld Indfasning</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-700 text-purple-100 uppercase tracking-wider">
                  Målarkitektur
                </span>
              </button>
            </div>

            {activeNodeId && (
              <button
                type="button"
                onClick={() => handleSelectNode(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                Nulstil Valg
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Context Hint */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <div>
            {activeYear === 2026 ? (
              <span>
                <strong className="text-slate-700">Status 2026:</strong> Fartøjer under 12 meter opererer under
                overgangsregler uden obligatorisk eLog og VMS. Kattegat CCTV er frivillig.
              </span>
            ) : (
              <span className="text-purple-900 font-medium">
                ✨ <strong className="text-purple-950">Status 2028:</strong> Fuld digitalisering trådt i kraft:
                Obligatorisk eLog & mobil-VMS for alle fartøjer &lt; 12m, lovpligtig CCTV for risikofartøjer &gt; 18m,
                og automatisk Art. 109 datavalidering.
              </span>
            )}
          </div>
          {activeNodeId && selectedNode && (
            <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Aktiv: {selectedNode.titleDa} ({connectedNodeIds.size - 1} forbindelser)
            </span>
          )}
        </div>
      </div>

      {/* Main 4-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MATRIX_COLUMNS.map((col) => {
          const nodes = nodesByColumn[col.id];
          return (
            <div
              key={col.id}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col space-y-3"
            >
              <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-slate-900 text-sm">{col.titleDa}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{col.descriptionDa}</p>
                </div>
                <span className="text-xs font-mono font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {nodes.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {nodes.map((node) => {
                  const isSelected = activeNodeId === node.id;
                  const isConnected = activeNodeId ? connectedNodeIds.has(node.id) : false;
                  const isDimmed = activeNodeId ? !isConnected : false;
                  const isNewIn2028 = node.introducedYear === 2028;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelectNode(isSelected ? null : node.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                          : isConnected
                          ? "bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                          : isDimmed
                          ? "bg-white/60 border-slate-200 opacity-30 hover:opacity-80"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-emerald-200 text-emerald-900 font-semibold"
                              : isConnected
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {node.category}
                        </span>

                        {isNewIn2028 && (
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                              activeYear === 2028
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            2028 Krav
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-semibold leading-snug ${
                          isSelected ? "text-emerald-950 font-bold" : "text-slate-900"
                        }`}
                      >
                        {node.titleDa}
                      </h4>

                      {node.subtitleDa && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{node.subtitleDa}</p>
                      )}

                      {/* Connection pill indicator */}
                      {isConnected && !isSelected && (
                        <div className="mt-2 pt-1 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-700">
                          <span className="font-medium">✓ Tilknyttet</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fakta-Panel / Inspector Drawer for Selected Node */}
      {selectedNode && (
        <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 shadow-lg transition-all animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  {selectedNode.category}
                </span>
                {selectedNode.legalReference && (
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    ⚖️ {selectedNode.legalReference}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mt-1">{selectedNode.titleDa}</h3>
              {selectedNode.subtitleDa && (
                <p className="text-xs text-slate-500 font-medium">{selectedNode.subtitleDa}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFacts}
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedNotification ? "✓ Kopieret!" : "Kopier Fakta"}
              </button>
              <button
                type="button"
                onClick={() => handleSelectNode(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                title="Luk fakta-panel"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Description & Field Catalog */}
            <div className="space-y-4 lg:col-span-1">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Forvaltningsmæssig Beskrivelse
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">{selectedNode.descriptionDa}</p>
              </div>

              {selectedNode.feltkatalogRefs && selectedNode.feltkatalogRefs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Tilknyttet Feltkatalog (EU 2025/2196)
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.feltkatalogRefs.map((ref, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded"
                      >
                        📄 {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Connections across the other 3 columns */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Forbundne Elementer ({connectedNodeIds.size - 1} relationer fundet)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {connectedByColumn &&
                  MATRIX_COLUMNS.filter((c) => c.id !== selectedNode.column).map((col) => {
                    const items = connectedByColumn[col.id];
                    return (
                      <div key={col.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-800 border-b border-slate-200 pb-1 mb-2 text-[11px]">
                          {col.titleDa} ({items.length})
                        </div>
                        {items.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Ingen direkte forbindelse</p>
                        ) : (
                          <div className="space-y-1.5">
                            {items.map(({ node, roleDa }) => (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSelectNode(node.id)}
                                className="w-full text-left p-1.5 bg-white hover:bg-emerald-50 rounded border border-slate-200 hover:border-emerald-300 transition-colors group"
                              >
                                <div className="font-medium text-slate-900 group-hover:text-emerald-950 line-clamp-1">
                                  {node.titleDa}
                                </div>
                                {roleDa && (
                                  <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                    → {roleDa}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
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
