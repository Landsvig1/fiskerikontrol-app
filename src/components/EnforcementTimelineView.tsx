import React, { useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Ship,
  ArrowRight,
} from "lucide-react";
import { GraphData } from "@/lib/types";
import {
  MilestoneStatus,
  getTimelineForCorpus,
} from "@/lib/timelineData";
import { Lang, TranslateFn } from "@/lib/i18n";

interface EnforcementTimelineViewProps {
  data: GraphData;
  lang: Lang;
  t?: TranslateFn;
  onInspectNode?: (nodeLabel: string) => void;
}

export function EnforcementTimelineView({
  data,
  lang,
  onInspectNode,
}: EnforcementTimelineViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | MilestoneStatus>("all");
  const milestones = getTimelineForCorpus(data);

  const filteredMilestones =
    statusFilter === "all"
      ? milestones
      : milestones.filter((m) => m.status === statusFilter);

  const inForceCount = milestones.filter((m) => m.status === "in_force").length;
  const upcomingCount = milestones.filter((m) => m.status === "upcoming").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fafaf9] text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="p-8 bg-white border-b border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
              <Calendar className="w-4 h-4 text-sky-700" />
              {lang === "da" ? "Ikrafttrædelse & Tidslinje" : "Enforcement Timeline"}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {lang === "da" ? "Overgangsordninger & Frister" : "Transitional Milestones & Deadlines"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {lang === "da"
                ? "Oversigt over hvornår nye EU- og nationale kontrolkrav træder i kraft for forskellige flådesegmenter."
                : "Chronological overview of when new EU and national fisheries control mandates take legal effect."}
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {inForceCount} {lang === "da" ? "I kraft nu" : "In force"}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              {upcomingCount} {lang === "da" ? "Kommende frister" : "Upcoming deadlines"}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg transition-all ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {lang === "da" ? "Alle frister" : "All milestones"} ({milestones.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_force")}
            className={`px-3 py-1 rounded-lg transition-all ${
              statusFilter === "in_force"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {lang === "da" ? "I kraft" : "In force"} ({inForceCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("upcoming")}
            className={`px-3 py-1 rounded-lg transition-all ${
              statusFilter === "upcoming"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {lang === "da" ? "Kommende" : "Upcoming"} ({upcomingCount})
          </button>
        </div>
      </div>

      {/* Main Content: Chronological Timeline */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Track Line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200 -z-0"></div>

          <div className="space-y-6">
            {filteredMilestones.map((milestone) => {
              const isInForce = milestone.status === "in_force";
              return (
                <div
                  key={milestone.id}
                  className="relative flex items-start gap-6 group"
                >
                  {/* Milestone Bullet */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border z-10 shadow-xs transition-all ${
                      isInForce
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-sky-700 border-sky-300 group-hover:border-sky-500"
                    }`}
                  >
                    {isInForce ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                          {lang === "da" ? milestone.formattedDateDa : milestone.formattedDateEn}
                        </span>
                        <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
                          {milestone.docCode} {milestone.article}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isInForce
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-sky-50 text-sky-800 border border-sky-200"
                          }`}
                        >
                          {isInForce
                            ? lang === "da"
                              ? "I kraft"
                              : "In force"
                            : lang === "da"
                            ? "Kommende frist"
                            : "Upcoming"}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            milestone.riskLevel === "high"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {milestone.riskLevel === "high"
                            ? lang === "da"
                              ? "Høj tilsynsrisiko"
                              : "High risk"
                            : lang === "da"
                            ? "Mellem risiko"
                            : "Medium risk"}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {lang === "da" ? milestone.titleDa : milestone.titleEn}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed mt-2 font-normal">
                      {lang === "da" ? milestone.descriptionDa : milestone.descriptionEn}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Ship className="w-3.5 h-3.5 text-sky-700" />
                        <span>
                          {lang === "da" ? "Omfattede flåder:" : "Affected fleet:"}{" "}
                          <strong className="text-slate-800">{milestone.affectedFleet}</strong>
                        </span>
                      </div>

                      {onInspectNode && (
                        <button
                          type="button"
                          onClick={() => onInspectNode(milestone.article)}
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                        >
                          {lang === "da" ? "Find artikel i graf" : "Inspect in graph"}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
