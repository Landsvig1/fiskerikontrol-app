"use client";

import React, { useMemo } from "react";
import { Layers, FilePen, ArrowRight, X, Link2, AlertTriangle } from "lucide-react";
import { TranslateFn, TranslationKey } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { buildConsolidation, buildAmendmentLedger } from "@/lib/consolidation";
import { GraphNode, GraphData } from "@/lib/types";

// ----------------------------------------------------
// VIEW: CONSOLIDATION (per-provision rollup + amendment ledger)
// ----------------------------------------------------
//
// The corpus contains three acts that amend or implement EU 1224/2009, and the question a
// caseworker maintaining the working consolidated text actually asks is "which provisions
// bear on this article, and which of them change it". That answer is a table. It is not a
// graph, and drawing it as one is what the two existing canvases already do without
// answering it.

const PAGE_SIZE = 40;

type Mode = "provisions" | "amendments";

export function ConsolidationView({
  data,
  selectedNode,
  setSelectedNode,
  t,
}: {
  data: GraphData;
  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;
  t: TranslateFn;
}) {
  const [mode, setMode] = React.useState<Mode>("provisions");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const rollups = useMemo(() => buildConsolidation(data), [data]);
  const ledger = useMemo(() => buildAmendmentLedger(data), [data]);

  const selectedRollup = useMemo(
    () => (selectedNode ? rollups.find(r => r.target.id === selectedNode.id) : undefined),
    [rollups, selectedNode]
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#fafaf9] text-slate-900 w-full min-w-0">
      <div className="max-w-5xl space-y-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {"Konsolidering"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {`${rollups.length} bestemmelser med henvisninger · ${ledger.length} ændringer på tværs af retsakter`}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-1">
          {"Hvilke bestemmelser bærer henvisninger fra flere retsakter, og hvilke af dem bliver rent faktisk ændret af en anden retsakt. Rangeringen følger antallet af forskellige retsakter, ikke det rå antal henvisninger: rå optællinger placerer proceduremæssige standardbestemmelser øverst."}
        </p>
      </div>

      {/* Mode switch */}
      <div className="inline-flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 mb-6">
        {(["provisions", "amendments"] as const).map(m => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              mode === m
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {m === "provisions" ? `Bestemmelser (${rollups.length})` : `Ændringsregister (${ledger.length})`}
          </button>
        ))}
      </div>

      {/* Ledger for the selected provision. Inline rather than in a modal, so the screen it
          produces is a screen a link can reach, which a modal over a list is not. Placed
          above the table because the table runs to dozens of rows: rendered after it, a
          selection lands below the fold and reads as nothing having happened. */}
      {selectedNode && (
        <div className="max-w-5xl mb-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 bg-slate-50/60">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border"
                  style={docBadgeStyle(data.docs, selectedNode.doc, { borderAlpha: "33" })}
                >
                  {docLabel(data.docs, selectedNode.doc, t)}
                </span>
                {selectedRollup && selectedRollup.amendCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200">
                    {`${selectedRollup.amendCount} ændring${selectedRollup.amendCount === 1 ? "" : "er"}`}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900">{selectedNode.label}</h3>
              {selectedNode.title && (
                <p className="text-xs text-slate-600 font-medium mt-0.5">{selectedNode.title}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer shrink-0"
              aria-label="Ryd valg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {!selectedRollup ? (
              // An uncited provision has no rollup at all. Saying so is different from
              // rendering an empty table, which reads as "nothing bears on this article".
              <p className="text-sm text-slate-500">
                {"Ingen henvisninger til denne bestemmelse blev fundet i det indlæste korpus."}
              </p>
            ) : (
              <>
                <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">
                  {`Henvist til af ${selectedRollup.incoming.length} bestemmelser i ${selectedRollup.actCount} retsakt${selectedRollup.actCount === 1 ? "" : "er"}`}
                </h4>
                <div className="space-y-3">
                  {selectedRollup.incoming.map((citation, i) => (
                    <div
                      key={`${citation.source.id}-${citation.modality}-${i}`}
                      className={`p-4 rounded-xl border ${
                        citation.amends
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-slate-50 border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setSelectedNode(citation.source)}
                            className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline cursor-pointer"
                          >
                            {citation.source.label}
                          </button>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                            style={docBadgeStyle(data.docs, citation.source.doc, { borderAlpha: "33" })}
                          >
                            {docLabel(data.docs, citation.source.doc, t)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {citation.amends && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                              <FilePen className="w-2.5 h-2.5" />
                              {"Ændrer"}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium">
                            {t(citation.modality.toLowerCase() as TranslationKey)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-serif italic text-slate-600 border-l-2 border-slate-300 pl-2 leading-relaxed">
                        &quot;...{citation.snippet}...&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {mode === "provisions" ? (
        <ProvisionTable
          data={data}
          rollups={rollups}
          visibleCount={visibleCount}
          onShowMore={() => setVisibleCount(c => c + PAGE_SIZE)}
          selectedId={selectedNode?.id ?? null}
          onSelect={setSelectedNode}
          t={t}
        />
      ) : (
        <AmendmentTable
          data={data}
          ledger={ledger}
          visibleCount={visibleCount}
          onShowMore={() => setVisibleCount(c => c + PAGE_SIZE)}
          onSelect={setSelectedNode}
          t={t}
        />
      )}

    </div>
  );
}

function ProvisionTable({
  data,
  rollups,
  visibleCount,
  onShowMore,
  selectedId,
  onSelect,
  t,
}: {
  data: GraphData;
  rollups: ReturnType<typeof buildConsolidation>;
  visibleCount: number;
  onShowMore: () => void;
  selectedId: string | null;
  onSelect: (node: GraphNode) => void;
  t: TranslateFn;
}) {
  if (rollups.length === 0) {
    return (
      <div className="max-w-5xl bg-white border border-slate-200 p-12 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
        {"Ingen henvisninger fundet i det indlæste korpus."}
      </div>
    );
  }

  return (
    <div className="max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Wide content scrolls inside its own container so the page body never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
              <th className="px-5 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {"Bestemmelse"}
              </th>
              <th className="px-5 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {"Retsakt"}
              </th>
              <th className="px-5 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right whitespace-nowrap">
                {"Retsakter"}
              </th>
              <th className="px-5 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right whitespace-nowrap">
                {"Henvisninger"}
              </th>
              <th className="px-5 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right whitespace-nowrap">
                {"Ændringer"}
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rollups.slice(0, visibleCount).map(rollup => (
              <tr
                key={rollup.target.id}
                onClick={() => onSelect(rollup.target)}
                className={`border-b border-slate-100 cursor-pointer transition-colors ${
                  selectedId === rollup.target.id ? "bg-sky-50/70" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-5 py-3">
                  <div className="font-semibold text-slate-900">{rollup.target.label}</div>
                  {rollup.target.title && (
                    <div className="text-xs text-slate-500 truncate max-w-xs">{rollup.target.title}</div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap"
                    style={docBadgeStyle(data.docs, rollup.target.doc, { borderAlpha: "33" })}
                  >
                    {docLabel(data.docs, rollup.target.doc, t)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">
                  {rollup.actCount}
                </td>
                <td className="px-5 py-3 text-right text-slate-600 tabular-nums">
                  {rollup.incoming.length}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {rollup.amendCount > 0 ? (
                    <span className="font-bold text-rose-800">{rollup.amendCount}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleCount < rollups.length && (
        <button
          onClick={onShowMore}
          className="w-full py-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-t border-slate-200 cursor-pointer transition-colors"
        >
          {`Vis flere (${rollups.length - visibleCount} tilbage)`}
        </button>
      )}
    </div>
  );
}

function AmendmentTable({
  data,
  ledger,
  visibleCount,
  onShowMore,
  onSelect,
  t,
}: {
  data: GraphData;
  ledger: ReturnType<typeof buildAmendmentLedger>;
  visibleCount: number;
  onShowMore: () => void;
  onSelect: (node: GraphNode) => void;
  t: TranslateFn;
}) {
  if (ledger.length === 0) {
    return (
      <div className="max-w-5xl bg-white border border-slate-200 p-12 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
        {"Ingen retsakt i det indlæste korpus ændrer en bestemmelse i en anden retsakt. Tilføj den ændrende retsakt til korpusset, for eksempel EU 2023/2842 sammen med EU 1224/2009."}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-3">
      {ledger.slice(0, visibleCount).map((entry, i) => (
        <div
          key={`${entry.source.id}-${entry.target.id}-${i}`}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* The amending ACT, not the amending article. An amending regulation quotes the
                replacement text it introduces, headings and all, and the heading splitter
                reads those quoted headings as sections of the amending act: EU 2023/2842 has
                six articles and parses as sixty-one. The act is the attribution that holds. */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded border"
              style={docBadgeStyle(data.docs, entry.sourceDoc, { borderAlpha: "33" })}
            >
              {docLabel(data.docs, entry.sourceDoc, t)}
            </span>
            <span className="text-rose-800 font-bold flex items-center gap-1">
              <FilePen className="w-3 h-3" />
              {"ændrer"}
            </span>
            <button
              onClick={() => onSelect(entry.target)}
              className="font-bold text-sky-800 hover:text-sky-950 hover:underline cursor-pointer"
            >
              {entry.target.label}
            </button>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded border"
              style={docBadgeStyle(data.docs, entry.target.doc, { borderAlpha: "33" })}
            >
              {docLabel(data.docs, entry.target.doc, t)}
            </span>
          </div>
          <p className="text-xs font-serif italic text-slate-600 border-l-2 border-rose-200 pl-2.5 leading-relaxed mt-3">
            &quot;...{entry.context}...&quot;
          </p>
        </div>
      ))}

      {visibleCount < ledger.length && (
        <button
          onClick={onShowMore}
          className="w-full py-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 rounded-xl cursor-pointer transition-colors bg-white/60"
        >
          {`Vis flere (${ledger.length - visibleCount} tilbage)`}
        </button>
      )}

      <div className="text-[11px] text-slate-500 leading-relaxed pt-2 space-y-1.5">
        <p className="flex items-start gap-1.5">
          <Link2 className="w-3 h-3 shrink-0 mt-0.5" />
          {"Registret viser kun ændringer, der rammer en anden retsakt. En ændringsforordning gentager sin egen instruktionstekst mange gange, og de gentagelser siger intet om, hvad der bliver ændret."}
        </p>
        <p className="flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />
          {"Ændringen tilskrives den ændrende retsakt, ikke en bestemt artikel i den. En ændringsforordning citerer den erstattende tekst med overskrifter og alt, og overskriftsgenkendelsen kan ikke skelne en citeret overskrift fra en rigtig: EU 2023/2842 har seks artikler og læses som 61. Målbestemmelsen er derimod pålidelig."}
        </p>
      </div>
    </div>
  );
}
