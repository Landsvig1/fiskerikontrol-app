"use client";

import React from "react";
import {
  Search,
  ArrowRight,
} from "lucide-react";
import { TranslateFn } from "@/lib/i18n";
import { docLabel, docBadgeStyle } from "@/lib/docDisplay";
import { themeLabel } from "@/lib/labels";
import { GraphNode, GraphData } from "@/lib/types";
import type { TabType } from "@/app/page";

// ----------------------------------------------------
// VIEW 5: BROWSE VIEW (Searchable List)
// ----------------------------------------------------

// The corpus runs to ~1200 provisions. Rendering all of them puts the full statutory text
// in the DOM, so the list is paged and each card shows a preview rather than the body.
const PAGE_SIZE = 100;
const BODY_PREVIEW_CHARS = 240;
export function BrowseView({ 
  data, 
  searchQuery, 
  setSearchQuery, 
  setSelectedNode, 
  setActiveTab,
  t
}: { 
  data: GraphData; 
  searchQuery: string; 
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
  t: TranslateFn;
}) {
  // Local input state, debounced into the shared searchQuery. searchQuery lives in page.tsx
  // and is read by the citation graph too, so writing it on every keystroke re-renders the
  // whole app and re-filters the corpus per character.
  const [inputValue, setInputValue] = React.useState(searchQuery);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  React.useEffect(() => {
    if (inputValue === searchQuery) return;
    const timer = setTimeout(() => setSearchQuery(inputValue), 200);
    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, setSearchQuery]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  // Unresolved external placeholders are citation targets outside the loaded corpus, not
  // provisions the caseworker can read. The graph and conflict views drop them as well.
  const browsableNodes = React.useMemo(
    () => data.nodes.filter(n => !n.external && !n.id.startsWith("external_")),
    [data.nodes]
  );

  // One lowercased haystack per node, built once. Lowercasing every body on every keystroke
  // allocated the whole corpus as throwaway strings per character typed.
  const haystackById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const n of browsableNodes) {
      map.set(n.id, `${n.label}\n${n.title}\n${n.body}\n${n.theme}`.toLowerCase());
    }
    return map;
  }, [browsableNodes]);

  const filteredNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return browsableNodes;
    const query = searchQuery.toLowerCase().trim();
    const queryNum = parseInt(query, 10);
    const isNumericQuery = /^\d+$/.test(query);

    const matches = browsableNodes.filter(n => (haystackById.get(n.id) ?? "").includes(query));

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
  }, [browsableNodes, haystackById, searchQuery]);

  const visibleNodes = filteredNodes.slice(0, visibleCount);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fafaf9] text-slate-900">
      <div className="p-8 bg-white border-b border-slate-200 space-y-4 shadow-2xs">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{"Gennemse sektioner"}</h2>
        <div className="max-w-xl relative">
          <input
            type="text"
            placeholder={"Søg i tekst, sektioner, kategorier..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 pl-11 rounded-xl outline-none focus:border-sky-500 focus:bg-white text-xs transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
        </div>
        <p className="text-xs text-slate-500">
          {filteredNodes.length === browsableNodes.length
            ? `${browsableNodes.length} sektioner i korpus`
            : `${filteredNodes.length} af ${browsableNodes.length} sektioner matcher`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {filteredNodes.length === 0 ? (
          <div className="max-w-xl bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 text-sm shadow-xs">
            {`Ingen sektioner matcher "${searchQuery.trim()}".`}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
          {visibleNodes.map(node => (
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
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded truncate max-w-[140px]" title={themeLabel(node.theme)}>
                    {themeLabel(node.theme)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-3">{node.label}</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">{node.title || t("noTitle")}</p>
                
                <p className="text-xs text-slate-600 leading-relaxed mt-4 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  {node.body.length > BODY_PREVIEW_CHARS
                    ? `${node.body.slice(0, BODY_PREVIEW_CHARS)}\u2026`
                    : node.body}
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
                  {"Inspicer forbindelser"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {visibleNodes.length < filteredNodes.length && (
          <div className="max-w-6xl mt-6 flex justify-center">
            <button
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-white border border-slate-200 hover:border-slate-400 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              {`Vis flere (${filteredNodes.length - visibleNodes.length} tilbage)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
