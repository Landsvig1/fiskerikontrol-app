"use client";

import React from "react";
import { Filter, Ship, Anchor, Compass, RotateCcw } from "lucide-react";
import {
  FleetFilterCriteria,
  VesselLengthFilter,
  GearTypeFilter,
  SeaAreaFilter,
  DEFAULT_FLEET_CRITERIA,
} from "@/lib/fleetFilter";

interface FleetFilterBarProps {
  criteria: FleetFilterCriteria;
  onChange: (criteria: FleetFilterCriteria) => void;
  matchCount?: number;
  totalCount?: number;
}

export function FleetFilterBar({
  criteria,
  onChange,
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
              {"Fartøjs- & Scenariescenarier"}
              {isFiltered && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {matchCount !== undefined && totalCount !== undefined
                    ? `${matchCount} / ${totalCount} sektioner`
                    : "Aktivt filter"}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              {"Begræns krav og modsigelser til specifikke flådesegmenter, redskaber eller farvande"}
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
            {"Nulstil flådefiltre"}
          </button>
        )}
      </div>

      {/* Select Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Vessel Size Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-sky-700" />
            {"Fartøjsstørrelse"}
          </label>
          <select
            value={criteria.vesselLength}
            onChange={handleLengthChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{"Alle fartøjslængder"}</option>
            <option value="under_8m">{"Under 8 meter (Småkystfiskeri)"}</option>
            <option value="8_12m">{"8 - 12 meter (Kystfartøjer)"}</option>
            <option value="12_18m">{"12 - 18 meter (Mellemstore kuttere)"}</option>
            <option value="over_18m">{"Over 18 meter (Havgående fartøjer)"}</option>
          </select>
        </div>

        {/* Gear Type Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-sky-700" />
            {"Redskabstype"}
          </label>
          <select
            value={criteria.gearType}
            onChange={handleGearChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{"Alle redskabstyper"}</option>
            <option value="passive_nets">{"Garn & Kroge (Passive redskaber)"}</option>
            <option value="active_trawl">{"Trawl & Bomtrawl (Aktive redskaber)"}</option>
            <option value="seine">{"Snurrevod & Not"}</option>
            <option value="traps">{"Tejner & Ruser"}</option>
          </select>
        </div>

        {/* Sea Area Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-700" />
            {"Farvandsområde"}
          </label>
          <select
            value={criteria.seaArea}
            onChange={handleAreaChange}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">{"Alle farvande"}</option>
            <option value="north_sea">{"Nordsøen & Skagerrak"}</option>
            <option value="kattegat">{"Kattegat & Sundet"}</option>
            <option value="baltic">{"Østersøen & Bælterne"}</option>
            <option value="inshore">{"Limfjorden & Indre Farvande"}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
