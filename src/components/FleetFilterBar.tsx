import React from "react";
import { Filter, Ship, Anchor, Compass, RotateCcw } from "lucide-react";
import {
  FleetFilterCriteria,
  VesselLengthFilter,
  GearTypeFilter,
  SeaAreaFilter,
  DEFAULT_FLEET_CRITERIA,
} from "@/lib/fleetFilter";
import { Lang } from "@/lib/i18n";

interface FleetFilterBarProps {
  criteria: FleetFilterCriteria;
  onChange: (criteria: FleetFilterCriteria) => void;
  lang: Lang;
  matchCount?: number;
  totalCount?: number;
}

export function FleetFilterBar({
  criteria,
  onChange,
  lang,
  matchCount,
  totalCount,
}: FleetFilterBarProps) {
  const isFiltered =
    criteria.vesselLength !== "all" ||
    criteria.gearType !== "all" ||
    criteria.seaArea !== "all";

  const handleLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...criteria, vesselLength: e.target.value as VesselLengthFilter });
  };

  const handleGearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...criteria, gearType: e.target.value as GearTypeFilter });
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...criteria, seaArea: e.target.value as SeaAreaFilter });
  };

  const handleReset = () => {
    onChange(DEFAULT_FLEET_CRITERIA);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              {lang === "da" ? "Fartøjs- & Scenariescenarier" : "Fleet & Scenario Filter"}
              {isFiltered && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {matchCount !== undefined && totalCount !== undefined
                    ? `${matchCount} / ${totalCount} ${lang === "da" ? "sektioner" : "sections"}`
                    : lang === "da"
                    ? "Aktivt filter"
                    : "Active filter"}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              {lang === "da"
                ? "Begræns krav og modsigelser til specifikke flådesegmenter, redskaber eller farvande"
                : "Limit requirements and conflicts to specific fleet segments, gears, or waters"}
            </p>
          </div>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            {lang === "da" ? "Nulstil flådefiltre" : "Reset fleet filters"}
          </button>
        )}
      </div>

      {/* Select Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Vessel Size Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-sky-700" />
            {lang === "da" ? "Fartøjsstørrelse" : "Vessel Length"}
          </label>
          <select
            value={criteria.vesselLength}
            onChange={handleLengthChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{lang === "da" ? "Alle fartøjslængder" : "All vessel lengths"}</option>
            <option value="under_8m">{lang === "da" ? "Under 8 meter (Småkystfiskeri)" : "Under 8m (Small coastal)"}</option>
            <option value="8_12m">{lang === "da" ? "8 - 12 meter (Kystfartøjer)" : "8 - 12m (Coastal fleet)"}</option>
            <option value="12_18m">{lang === "da" ? "12 - 18 meter (Mellemstore kuttere)" : "12 - 18m (Mid-size cutters)"}</option>
            <option value="over_18m">{lang === "da" ? "Over 18 meter (Havgående fartøjer)" : "Over 18m (Offshore vessels)"}</option>
          </select>
        </div>

        {/* Gear Type Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-sky-700" />
            {lang === "da" ? "Redskabstype" : "Gear Type"}
          </label>
          <select
            value={criteria.gearType}
            onChange={handleGearChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{lang === "da" ? "Alle redskabstyper" : "All gear types"}</option>
            <option value="passive_nets">{lang === "da" ? "Garn & Kroge (Passive redskaber)" : "Nets & Hooks (Passive gear)"}</option>
            <option value="active_trawl">{lang === "da" ? "Trawl & Bomtrawl (Aktive redskaber)" : "Trawls & Beam (Active gear)"}</option>
            <option value="seine">{lang === "da" ? "Snurrevod & Not" : "Danish Seine & Ring net"}</option>
            <option value="traps">{lang === "da" ? "Tejner & Ruser" : "Pots & Traps"}</option>
          </select>
        </div>

        {/* Sea Area Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-700" />
            {lang === "da" ? "Farvandsområde" : "Sea Area"}
          </label>
          <select
            value={criteria.seaArea}
            onChange={handleAreaChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{lang === "da" ? "Alle farvande" : "All sea basins"}</option>
            <option value="north_sea">{lang === "da" ? "Nordsøen & Skagerrak" : "North Sea & Skagerrak"}</option>
            <option value="kattegat">{lang === "da" ? "Kattegat & Sundet" : "Kattegat & The Sound"}</option>
            <option value="baltic">{lang === "da" ? "Østersøen & Bælterne" : "Baltic Sea & Belts"}</option>
            <option value="inshore">{lang === "da" ? "Limfjorden & Indre Farvande" : "Limfjorden & Inshore Waters"}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
