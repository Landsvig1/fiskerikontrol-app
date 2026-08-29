"use client";

import { useMemo } from "react";
import {
  Layers,
  ArrowRight,
} from "lucide-react";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { GraphNode, GraphData } from "@/lib/types";
import type { TabType } from "@/app/page";

// ----------------------------------------------------
// VIEW 3: OVERLAPS VIEW
// ----------------------------------------------------
export function OverlapsView({ 
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
  // One index instead of an O(n) scan per overlap, per citation, per render.
  const nodeById = useMemo(() => new Map(data.nodes.map(n => [n.id, n])), [data.nodes]);

  // Copy before sorting, sort() mutates in place, and data.overlaps is owned by the parent.
  // External placeholders are already excluded upstream, in the parser, so the count in the
  // tab label and on the dashboard matches this list.
  const overlapsList = useMemo(
    () => [...data.overlaps].sort((a, b) => b.count - a.count),
    [data.overlaps]
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#fafaf9] text-slate-900">
      <div className="max-w-4xl space-y-2 mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="text-amber-600 w-6 h-6" /> {t("overlapsCount") /* Overlappende sektionsreferencer */}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {"Nedenfor vises en liste over bestemmelser, der er genstand for flere uafhængige kildehenvisninger. Dette er indikatorer for retlig kompleksitet."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {overlapsList.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
            {"Ingen overlap fundet."}
          </div>
        ) : (
          overlapsList.map((record, i) => {
            const targetNode = nodeById.get(record.target);
            if (!targetNode) return null;

            return (
              <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                        {`Overlap (${record.count} referencer)`}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded border"
                        style={docBadgeStyle(data.docs, targetNode.doc, { borderAlpha: "33" })}
                      >
                        {docLabel(data.docs, targetNode.doc, t)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mt-2 text-slate-900">
                      {"Målsektion: "} <span className="text-sky-800">{targetNode.label}</span>
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
                    {"Refererende sektioner:"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {record.citations.map((c, idx) => {
                      const sourceNode = nodeById.get(c.source);
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
