"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  Scale,
  Info,
} from "lucide-react";
import { TranslateFn } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { euSupremacyApplies, selectPrecedenceCitation } from "@/lib/jurisdiction";
import { GraphNode, ConflictRecord, GraphData } from "@/lib/types";
import type { TabType } from "@/app/page";

// ----------------------------------------------------
// VIEW 4: CONFLICTS VIEW (KRAV VS. UNDTAGELSE CONTRAST)
// ----------------------------------------------------
function cleanAndNormalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    // U+2013 en dash and U+2014 em dash, written as escapes so the source file stays
    // free of the literal characters. Parsed legal text leads with them often enough.
    .replace(/^[\s\-\u2013\u2014:;.]+/, "")
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

export function ConflictsView({ 
  data, 
  setSelectedNode, 
  setActiveTab,
  onInspectConflict,
  t,
}: { 
  data: GraphData; 
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  onInspectConflict: (conflict: ConflictRecord) => void;
  t: TranslateFn;
}) {
  // One index instead of an O(n) scan per conflict, per citation, per render.
  const nodeById = useMemo(() => new Map(data.nodes.map(n => [n.id, n])), [data.nodes]);

  const realConflicts = data.conflicts.filter(record => {
    const targetNode = nodeById.get(record.target);
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
              {realConflicts.length} {"identificerede modstridskollisioner på tværs af retsakter"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-1 break-words">
          {t("conflictsHeaderSubtitle")}
        </p>

        {/* The subtitle above promises automatic identification of contradictions. What the
            parser actually produces is a keyword classification over a window around each
            citation, so the promise needs qualifying where the list is read, not in a
            README nobody opens mid-case. */}
        <div className="max-w-3xl flex gap-2.5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed break-words">
            {t("conflictsHeuristicNotice")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl w-full min-w-0">
        {realConflicts.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
            {"Ingen retlige modstrid fundet i det indlæste korpus."}
          </div>
        ) : (
          realConflicts.map((record, i) => {
            const targetNode = nodeById.get(record.target);
            if (!targetNode) return null;

            // A record can hold citations from several documents, and the parser emits them in
            // scan order, so citations[0] is not a legal choice. selectPrecedenceCitation picks
            // the source that makes the record's strongest claim. Every part of this card, the
            // badge, the pair heading, the doc chip and the snippet, reads that one citation,
            // so the card always describes a single pair.
            const primaryCitation = selectPrecedenceCitation(
              data.docs,
              record.citations,
              targetNode,
              id => nodeById.get(id)
            );
            const sourceNode = primaryCitation ? nodeById.get(primaryCitation.source) : undefined;
            // Precedence is derived from the document labels, never from docId ordering.
            // The memo applies the same gate per citing section and reports every pair, so the
            // memo can name pairs this card does not show; what it must never do is reach a
            // different verdict for the pair the card names.
            const euSupremacy = euSupremacyApplies(data.docs, sourceNode, targetNode);

            const precedenceBadgeText = euSupremacy
              ? ("⚖️ EU-forordning har forrang")
              : ("⚖️ Retslig afklaring påkrævet");

            const verdictText = euSupremacy
              ? (`EU-forordningen (${targetNode.label}) er direkte gældende og har forrang over for dansk bekendtgørelse. Fiskeristyrelsens tilsyn kan ikke lovligt håndhæve en national dispensation i modstrid med EU-kravet, og fartøjer risikerer overtrædelsessag ved EU-inspektion eller ved landing i andre EU-medlemsstater.`)
              : (`Der foreligger modstridende modaliteter mellem bestemmelserne. Delegerede retsakter og bekendtgørelser skal fortolkes i overensstemmelse med grundforordningens kontrolformål.`);

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
                        {"Modstrid: Krav vs. Undtagelse"}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border shrink-0 ${
                        euSupremacy
                          ? "bg-sky-100 text-sky-900 border-sky-300"
                          : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}>
                        {precedenceBadgeText}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 pt-0.5 break-words flex flex-wrap items-center gap-1.5">
                      <span className="text-sky-800 shrink-0">{targetNode.label}</span>
                      <span className="text-slate-400 font-normal">⟷</span>
                      <span className="text-amber-800 break-words">{sourceNode?.label || ("National bestemmelse")}</span>
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
                        {targetNode.label} {targetNode.title ? `- ${cleanAndNormalizeText(targetNode.title)}` : ""}
                      </h4>
                    </div>

                    <div className="mt-3 p-3 bg-sky-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-sky-100 border-l-2 border-l-sky-600 break-words whitespace-normal overflow-hidden">
                      {highlightConflictKeywords(
                        (() => {
                          const parentNode = targetNode.parent_id ? nodeById.get(targetNode.parent_id) : undefined;
                          const rawBody = targetNode.body && !targetNode.body.startsWith("Se overordnet sektion") 
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
                        {sourceNode?.label || ("National sektion")} {sourceNode?.title ? `- ${cleanAndNormalizeText(sourceNode.title)}` : ""}
                      </h4>
                    </div>

                    <div className="mt-3 p-3 bg-amber-50/50 rounded-lg text-xs leading-relaxed text-slate-800 border border-amber-100 border-l-2 border-l-amber-600 break-words whitespace-normal overflow-hidden">
                      {highlightConflictKeywords(
                        (() => {
                          const rawText = primaryCitation?.snippet || sourceNode?.body || ("Dispenserende bestemmelse");
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
