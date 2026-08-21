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
import { ConflictRecord, GraphData, GraphNode } from "@/lib/types";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { highlightModalKeywords } from "@/lib/highlightText";
import { formatConflictDescription } from "@/lib/labels";

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
      `===========================================`,
      `JURIDISK MODSTRIDSNOTAT (LEXGRAPH)`,
      `===========================================`,
      `Target: ${targetNode.label} (${docLabel(data.docs, targetNode.doc, t)})`,
      `Kilde: ${sourceNode.label} (${docLabel(data.docs, sourceNode.doc, t)})`,
      `Beskrivelse: ${formatConflictDescription(conflict.description, targetNode.label, t("noHeading") === "(No title)" ? "en" : "da")}`,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/80 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded shrink-0">
                  {t("inspectConflict")} ({conflict.modalities.map((m) => t(m.toLowerCase() as TranslationKey)).join(" / ")})
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 truncate max-w-[160px]"
                  style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "40" })}
                >
                  {docLabel(data.docs, targetNode.doc, t)}
                </span>
              </div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-900 mt-0.5 break-words">
                {targetNode.label} {targetNode.title ? `— ${targetNode.title}` : ""}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer ml-2"
            aria-label={t("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Guidance Precedence Callout */}
        <div className="px-6 py-3 bg-sky-50/60 border-b border-sky-100 flex items-center justify-between gap-4 flex-wrap min-w-0">
          <div className="flex items-center gap-2 text-xs text-sky-900 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="font-semibold shrink-0">EU-retlig forrang:</span>
            <span className="text-sky-800 break-words">
              EU-forordninger har direkte retsvirkning og overtrumfer nationale bekendtgørelser. Nationale undtagelser kan ikke lovligt fravige bindende EU-krav.
            </span>
          </div>
        </div>

        {/* If multiple citations/sources collide on this target, provide selector pills */}
        {conflict.citations.length > 1 && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto min-w-0">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1 shrink-0">
              <GitBranch className="w-3.5 h-3.5 text-sky-600 shrink-0" /> Modstridende kilder ({conflict.citations.length}):
            </span>
            {conflict.citations.map((c, idx) => {
              const src = data.nodes.find((n) => n.id === c.source);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedCitationIndex(idx)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCitationIndex === idx
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {src?.label || c.source} ({t(c.modality.toLowerCase() as TranslationKey)})
                </button>
              );
            })}
          </div>
        )}

        {/* Dual-Pane Side-by-Side Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#fafaf9] min-w-0">
          {/* Left Pane: Target/Base Provision */}
          <div className="flex flex-col bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs min-w-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  {t("baseProvision")}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2 truncate">
                  <BookOpen className="w-4 h-4 text-sky-600 shrink-0" /> {targetNode.label}
                </h3>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 truncate max-w-[150px]"
                style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "40" })}
              >
                {docLabel(data.docs, targetNode.doc, t)}
              </span>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 min-w-0">
              {targetNode.title && (
                <p className="text-xs font-medium text-slate-600 border-b border-slate-100 pb-2 break-words">
                  {targetNode.title}
                </p>
              )}
              <div className="text-xs leading-relaxed text-slate-800 break-words whitespace-pre-wrap">
                {highlightModalKeywords(targetNode.body)}
              </div>
            </div>
          </div>

          {/* Right Pane: Source/Derogating Provision */}
          <div className="flex flex-col bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs min-w-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  {t("derogatingProvision")}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2 truncate">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> {sourceNode?.label || activeCitation?.source}
                </h3>
              </div>
              {sourceNode && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 truncate max-w-[150px]"
                  style={docBadgeStyle(data.docs, sourceNode.doc, { borderAlpha: "40" })}
                >
                  {docLabel(data.docs, sourceNode.doc, t)}
                </span>
              )}
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 min-w-0">
              {sourceNode?.title && (
                <p className="text-xs font-medium text-slate-600 border-b border-slate-100 pb-2 break-words">
                  {sourceNode.title}
                </p>
              )}

              {/* Specific citation context callout */}
              {activeCitation?.snippet && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/70 text-xs text-amber-900 italic leading-relaxed break-words">
                  &quot;...{activeCitation.snippet}...&quot;
                </div>
              )}

              <div className="text-xs leading-relaxed text-slate-800 break-words whitespace-pre-wrap">
                {sourceNode ? highlightModalKeywords(sourceNode.body) : "Ingen detaljeret tekst tilgængelig for denne kilde."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-wrap">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-all flex items-center gap-2 cursor-pointer border border-slate-200 shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? t("copiedToClipboard") : t("copyConflictBrief")}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onSelectNode(targetNode);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {t("showInGraph")} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
            >
              {t("closeModal")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
