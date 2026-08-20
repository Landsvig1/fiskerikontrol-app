"use client";

import React, { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  X, 
  Copy, 
  Check, 
  ArrowRight, 
  BookOpen, 
  ShieldAlert,
  GitBranch
} from "lucide-react";
import { ConflictRecord, GraphData, GraphNode } from "@/app/page";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { highlightModalKeywords } from "@/lib/highlightText";

interface ConflictInspectorModalProps {
  conflict: ConflictRecord;
  data: GraphData;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  t: TranslateFn;
}

export function ConflictInspectorModal({
  conflict,
  data,
  onClose,
  onSelectNode,
  t,
}: ConflictInspectorModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState(0);

  const targetNode = data.nodes.find((n) => n.id === conflict.target);
  const activeCitation = conflict.citations[selectedCitationIndex] || conflict.citations[0];
  const sourceNode = activeCitation ? data.nodes.find((n) => n.id === activeCitation.source) : null;

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopySummary = async () => {
    if (!targetNode || !sourceNode) return;

    const summaryText = [
      `=== JURIDISK MODSTRIDSNOTAT (LEXGRAPH) ===`,
      `Dato: ${new Date().toISOString().split("T")[0]}`,
      `Modstrid vedrørende: ${targetNode.label} (${docLabel(data.docs, targetNode.doc, t)})`,
      `Konflikt-modaliteter: ${conflict.modalities.join(" / ")}`,
      `Beskrivelse: ${conflict.description}`,
      ``,
      `--- HOVEDBESTEMMELSE (${targetNode.label}) ---`,
      `Titel: ${targetNode.title || "Uden titel"}`,
      `Tekst:\n${targetNode.body}`,
      ``,
      `--- MODSTRIDENDE / UNDTAGENDE BESTEMMELSE (${sourceNode.label}) ---`,
      `Dokument: ${docLabel(data.docs, sourceNode.doc, t)}`,
      `Modalitet: ${activeCitation?.modality || "Ukendt"}`,
      `Titel: ${sourceNode.title || "Uden titel"}`,
      `Kontekst-uddrag: "${activeCitation?.snippet || ""}"`,
      `Tekst:\n${sourceNode.body}`,
      `===========================================`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      setCopied(false);
    }
  };

  if (!targetNode) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0d1527] border border-[#ef4444]/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#110e19]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-[#f87171] bg-[#ef4444]/10 border border-[#ef4444]/30 px-2 py-0.5 rounded">
                  {t("inspectConflict")} ({conflict.modalities.map((m) => t(m.toLowerCase() as TranslationKey)).join(" / ")})
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border"
                  style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "33" })}
                >
                  {docLabel(data.docs, targetNode.doc, t)}
                </span>
              </div>
              <h2 id="modal-title" className="text-lg font-extrabold text-[#f8fafc] mt-0.5">
                {targetNode.label} {targetNode.title ? `— ${targetNode.title}` : ""}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] transition-all cursor-pointer"
            aria-label={t("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plain-Language Conflict Summary Banner */}
        <div className="px-6 py-3 bg-[#ef4444]/10 border-b border-[#ef4444]/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#f87171] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed text-[#f8fafc]">
            <p className="font-semibold text-[#fca5a5]">
              {t("conflictSummaryBanner")}:
            </p>
            <p className="text-[#e2e8f0]">
              {conflict.description}
            </p>
          </div>
        </div>

        {/* If multiple citations/sources collide on this target, provide selector pills */}
        {conflict.citations.length > 1 && (
          <div className="px-6 py-2 bg-[#070b13] border-b border-[#1e293b] flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-[#94a3b8] whitespace-nowrap flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-[#38bdf8]" /> Modstridende kilder ({conflict.citations.length}):
            </span>
            {conflict.citations.map((c, idx) => {
              const src = data.nodes.find((n) => n.id === c.source);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedCitationIndex(idx)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCitationIndex === idx
                      ? "bg-[#38bdf8] text-[#070b13] shadow-sm"
                      : "bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc]"
                  }`}
                >
                  {src?.label || c.source} ({t(c.modality.toLowerCase() as TranslationKey)})
                </button>
              );
            })}
          </div>
        )}

        {/* Dual-Pane Side-by-Side Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#070b13]">
          {/* Left Pane: Target/Base Provision */}
          <div className="flex flex-col bg-[#0d1527] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#1e293b] bg-[#10192e] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider block">
                  {t("baseProvision")}
                </span>
                <h3 className="text-sm font-bold text-[#f8fafc] mt-0.5 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#38bdf8]" /> {targetNode.label}
                </h3>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "40" })}
              >
                {docLabel(data.docs, targetNode.doc, t)}
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {targetNode.title && (
                <p className="text-xs font-semibold text-[#94a3b8] italic border-b border-[#1e293b]/60 pb-2">
                  {targetNode.title}
                </p>
              )}
              <div className="text-xs font-serif leading-relaxed text-[#f8fafc]/90 whitespace-pre-wrap">
                {highlightModalKeywords(targetNode.body)}
              </div>
            </div>
          </div>

          {/* Right Pane: Source/Derogating Provision */}
          <div className="flex flex-col bg-[#0d1527] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#1e293b] bg-[#110e19] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#f87171] uppercase tracking-wider block">
                  {t("derogatingProvision")}
                </span>
                <h3 className="text-sm font-bold text-[#f8fafc] mt-0.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#f87171]" /> {sourceNode?.label || activeCitation?.source}
                </h3>
              </div>
              {sourceNode && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border"
                  style={docBadgeStyle(data.docs, sourceNode.doc, { borderAlpha: "40" })}
                >
                  {docLabel(data.docs, sourceNode.doc, t)}
                </span>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {sourceNode?.title && (
                <p className="text-xs font-semibold text-[#94a3b8] italic border-b border-[#1e293b]/60 pb-2">
                  {sourceNode.title}
                </p>
              )}

              {/* Specific citation context callout */}
              {activeCitation?.snippet && (
                <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/25 text-xs text-[#fca5a5] italic leading-relaxed">
                  &quot;...{activeCitation.snippet}...&quot;
                </div>
              )}

              <div className="text-xs font-serif leading-relaxed text-[#f8fafc]/90 whitespace-pre-wrap">
                {sourceNode ? highlightModalKeywords(sourceNode.body) : "Ingen detaljeret tekst tilgængelig for denne kilde."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#1e293b] bg-[#0d1527] flex-wrap">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-[#f8fafc] transition-all flex items-center gap-2 cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40"
          >
            {copied ? <Check className="w-4 h-4 text-[#34d399]" /> : <Copy className="w-4 h-4" />}
            {copied ? t("copiedToClipboard") : t("copyConflictBrief")}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onSelectNode(targetNode);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-[#38bdf8] text-[#070b13] text-xs font-bold hover:bg-[#38bdf8]/90 transition-all flex items-center gap-1.5 shadow-md shadow-[#38bdf8]/15 cursor-pointer"
            >
              {t("showInGraph")} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-[#94a3b8] hover:text-[#f8fafc] transition-all cursor-pointer"
            >
              {t("closeModal")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
