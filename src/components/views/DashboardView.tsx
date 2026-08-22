"use client";

import React from "react";
import {
  BookOpen,
  Activity,
  GitBranch,
  Database,
  ArrowRight,
  Info,
  CheckCircle,
  Scale,
} from "lucide-react";
import { FleetFilterCriteria, matchesFleetCriteria } from "@/lib/fleetFilter";
import { TranslateFn } from "@/lib/i18n";
import { docLabel, docColorFor } from "@/lib/docDisplay";
import { GraphData } from "@/lib/types";
import { FleetFilterBar } from "@/components/FleetFilterBar";
import type { TabType } from "@/app/page";

// ----------------------------------------------------
// VIEW 1: DASHBOARD VIEW
// ----------------------------------------------------
export function DashboardView({ 
  data, 
  setActiveTab, 
  fleetCriteria,
  setFleetCriteria,
  t
}: { 
  data: GraphData; 
  setActiveTab: (tab: TabType) => void;
  fleetCriteria: FleetFilterCriteria;
  setFleetCriteria: (criteria: FleetFilterCriteria) => void;
  t: TranslateFn;
}) {
  const isFiltered =
    fleetCriteria.vesselLength !== "all" ||
    fleetCriteria.gearType !== "all" ||
    fleetCriteria.seaArea !== "all";

  const filteredNodes = data.nodes.filter(n => matchesFleetCriteria(n, fleetCriteria));
  const realConflicts = data.conflicts.filter(record => {
    const targetNode = data.nodes.find(n => n.id === record.target);
    return targetNode && !targetNode.external && !targetNode.id.startsWith("external_");
  });
  const countsByDoc = data.docs.map(d => {
    const totalCount = data.nodes.filter(n => n.doc === d.id && !n.is_subnode).length;
    const count = filteredNodes.filter(n => n.doc === d.id && !n.is_subnode).length;
    return {
      ...d,
      totalCount,
      count,
    };
  });
  const totalPrimaryNodes = filteredNodes.filter(n => !n.is_subnode).length;
  const totalCitations = data.links.length;
  const docLabels = data.docs.map(d => d.label);
  const docLabelList = new Intl.ListFormat("da", { style: "long", type: "conjunction" }).format(docLabels);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fafaf9] text-slate-900">
      {/* Fleet & Scenario Filter Bar */}
      <FleetFilterBar
        criteria={fleetCriteria}
        onChange={setFleetCriteria}
        matchCount={filteredNodes.length}
        totalCount={data.nodes.length}
      />
      {/* Citation Graph Preview */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase font-bold text-sky-800 tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-700" /> {t("citationGraph")} {"Oversigt"}
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {"Klar"}
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          {`Grafen er genereret på baggrund af de uploadede dokumenter: ${docLabelList}. Netværket kortlægger sektionerne som noder og de modallogiske henvisninger som kanter.`
          }
        </p>

        <button
          onClick={() => setActiveTab("citation")}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {"Åbn Citation Graf"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Intro Hero Section */}
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {"Kortlægning af dokumentcitationer og relationer"}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {"Dette værktøj analyserer afhængigheder, krydsreferencer og logiske modstrid i de analyserede dokumenter. Ved at dekonstruere teksten til en struktur af noder (sektioner) og kanter (citationer/modallogiske bindinger) kan vi automatisk afdække overlap og uoverensstemmelser."
          }
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
        {countsByDoc.map(d => {
          const isEu = d.label.toLowerCase().includes("eu") || d.id.toLowerCase().includes("eu");
          return (
            <div
              key={d.id}
              className={`p-6 rounded-2xl shadow-xs transition-all duration-200 ${
                isEu
                  ? "bg-white border-2 border-sky-200 hover:border-sky-400"
                  : "bg-slate-50/60 border border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="w-7 h-7" style={{ color: docColorFor(data.docs, d.id) }} />
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  isEu
                    ? "bg-sky-100 text-sky-900 border border-sky-300 font-bold"
                    : "bg-slate-200/80 text-slate-600 border border-slate-300/80 font-normal"
                }`}>
                  {isEu 
                    ? "EU Primær" 
                    : "National"}
                </span>
              </div>
              <h3 className={`text-xs uppercase tracking-wider truncate ${isEu ? "font-bold text-slate-800" : "font-medium text-slate-500"}`}>
                {docLabel(data.docs, d.id, t)}
              </h3>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-3xl font-bold ${isEu ? "text-slate-900" : "text-slate-700"}`}>{d.count}</p>
                  {isFiltered && d.count !== d.totalCount && (
                    <span className="text-xs font-semibold text-slate-400">
                      / {d.totalCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {isFiltered
                    ? (`gældende artikler for flådeprofil`)
                    : (`analyserede artikler i retsakt`)}
                </p>
              </div>
            </div>
          );
        })}

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer" onClick={() => setActiveTab("overlaps")}>
          <GitBranch className="w-7 h-7 text-amber-600 mb-4" />
          <h3 className="text-xs uppercase font-medium text-slate-500 tracking-wider">{t("overlapsCount")}</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-bold text-slate-900">{data.overlaps.length}</p>
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">{t("viewAnalysis")} <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        <div 
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer" 
          onClick={() => setActiveTab("conflicts")}
        >
          <Scale className="w-7 h-7 text-slate-600 mb-4" />
          <h3 className="text-xs uppercase font-medium text-slate-500 tracking-wider">{t("conflictsCount")}</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-bold text-slate-900">{realConflicts.length}</p>
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1 hover:text-slate-900">{t("viewConflicts")} <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Graph Summary */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-700" /> {"Netværksstruktur"}
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {<>Vi har udtrukket i alt <strong className="text-slate-900">{data.nodes.length} noder</strong> og etableret <strong className="text-slate-900">{totalCitations} relationer</strong> baseret på automatiske kildehenvisninger.</>
              }
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">{"Gennemsnitlige referencer pr. sektion"}</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{(totalCitations / Math.max(1, totalPrimaryNodes)).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">{"Modallogiske krydsreferencer"}</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCitations}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("graph")}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {"Åbn Interaktiv Netværksgraf"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* System Description */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700" /> {"Sådan fungerer analyse-motoren"}
          </h3>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {<><strong>Modalklassificering:</strong> Hver krydsreference tildeles en modalitet (Forpligtelse, Undtagelse, Tilladelse, Forbud) ud fra tekstkonteksten (fx ord som <em>&quot;fritages&quot;</em>, <em>&quot;skal&quot;</em>, <em>&quot;må ikke&quot;</em>).</>
                }
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {<><strong>Kollisions-detektion:</strong> Hvis en sektion pålægger krav (Obligation), mens en anden sektion uafhængigt heraf tildeler en undtagelse (Exception) eller et forbud (Prohibition) i forhold til samme reference, flages dette som en potentiel konflikt.</>
                }
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                {<><strong>Overlappende reference:</strong> Finder kernebestemmelser, som refereres af usædvanligt mange separate sektioner, hvilket øger kompleksiteten.</>
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
