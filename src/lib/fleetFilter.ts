import { GraphNode } from "./types";

export type VesselLengthFilter = "all" | "under_8m" | "8_12m" | "12_18m" | "over_18m";
export type GearTypeFilter = "all" | "passive_nets" | "active_trawl" | "seine" | "traps";
export type SeaAreaFilter = "all" | "north_sea" | "kattegat" | "baltic" | "inshore";

export interface FleetFilterCriteria {
  vesselLength: VesselLengthFilter;
  gearType: GearTypeFilter;
  seaArea: SeaAreaFilter;
}

export const DEFAULT_FLEET_CRITERIA: FleetFilterCriteria = {
  vesselLength: "all",
  gearType: "all",
  seaArea: "all",
};

/**
 * Checks if a statutory graph node matches the selected fleet profile and scenario criteria.
 */
export function matchesFleetCriteria(node: GraphNode, criteria: FleetFilterCriteria): boolean {
  if (
    criteria.vesselLength === "all" &&
    criteria.gearType === "all" &&
    criteria.seaArea === "all"
  ) {
    return true;
  }

  const searchableText = `${node.label} ${node.title || ""} ${node.body || ""} ${node.theme || ""}`.toLowerCase();

  // 1. Vessel Length Filtering
  if (criteria.vesselLength !== "all") {
    const targetsLarge12Plus = 
      searchableText.includes("12 meter eller derover") ||
      searchableText.includes("12 m eller derover") ||
      searchableText.includes("mindst 12 meter") ||
      searchableText.includes("mindst 12 m") ||
      searchableText.includes("over 12 meter") ||
      searchableText.includes("over 12 m") ||
      searchableText.includes("> 12") ||
      searchableText.includes(">12") ||
      searchableText.includes("15 meter") ||
      searchableText.includes("15 m") ||
      searchableText.includes("18 meter") ||
      searchableText.includes("18 m") ||
      searchableText.includes("24 meter") ||
      searchableText.includes("24 m") ||
      searchableText.includes("cctv") ||
      searchableText.includes("kameraovervågning") ||
      searchableText.includes("ais") ||
      searchableText.includes("vms") ||
      searchableText.includes("forhåndsmeddelelse") ||
      searchableText.includes("motorkraft");

    const targetsSmallUnder12 =
      searchableText.includes("under 8") ||
      searchableText.includes("< 8") ||
      searchableText.includes("<8") ||
      searchableText.includes("mindre end 8") ||
      searchableText.includes("under 10") ||
      searchableText.includes("< 10") ||
      searchableText.includes("<10") ||
      searchableText.includes("mindre end 10") ||
      searchableText.includes("under 12") ||
      searchableText.includes("< 12") ||
      searchableText.includes("<12") ||
      searchableText.includes("mindre end 12") ||
      searchableText.includes("kystfisker") ||
      searchableText.includes("kystfartøj") ||
      searchableText.includes("småskala");

    if (criteria.vesselLength === "under_8m") {
      if (targetsLarge12Plus && !targetsSmallUnder12) {
        return false;
      }
    } else if (criteria.vesselLength === "8_12m") {
      const targetsLarge15Plus = 
        searchableText.includes("15 meter") ||
        searchableText.includes("15 m") ||
        searchableText.includes("18 meter") ||
        searchableText.includes("18 m") ||
        searchableText.includes("24 meter") ||
        searchableText.includes("24 m") ||
        searchableText.includes("cctv") ||
        searchableText.includes("kameraovervågning");
      if (targetsLarge15Plus && !targetsSmallUnder12) {
        return false;
      }
      if (searchableText.includes("kun under 8") || searchableText.includes("fartøjer under 8 meter")) {
        return false;
      }
    } else if (criteria.vesselLength === "12_18m") {
      const targetsOver18 =
        searchableText.includes("18 meter eller derover") ||
        searchableText.includes("mindst 18 meter") ||
        searchableText.includes("over 18 meter") ||
        searchableText.includes("> 18") ||
        searchableText.includes("24 meter") ||
        searchableText.includes("cctv") ||
        searchableText.includes("kameraovervågning");
      if (targetsOver18) {
        return false;
      }
      if (targetsSmallUnder12 && !targetsLarge12Plus) {
        return false;
      }
    } else if (criteria.vesselLength === "over_18m") {
      if (targetsSmallUnder12 && !targetsLarge12Plus) {
        return false;
      }
    }
  }

  // 2. Gear Type Filtering
  if (criteria.gearType !== "all") {
    const isTrawlSpecific = 
      searchableText.includes("trawl") || 
      searchableText.includes("bomtrawl") || 
      searchableText.includes("bundtrawl") || 
      searchableText.includes("pelagisk") || 
      searchableText.includes("løftetrawl") ||
      searchableText.includes("trawlfiskeri");

    const isNetSpecific = 
      searchableText.includes("garn") || 
      searchableText.includes("sættegarn") || 
      searchableText.includes("drivgarn") || 
      searchableText.includes("pinger") || 
      searchableText.includes("akustisk") || 
      searchableText.includes("maskevidde i garn") ||
      searchableText.includes("garnlængde");

    const isSeineSpecific = 
      searchableText.includes("snurrevod") || 
      searchableText.includes("vod") || 
      searchableText.includes("ringnot");

    const isTrapSpecific = 
      searchableText.includes("tejn") || 
      searchableText.includes("ruse") || 
      searchableText.includes("hummertejn") || 
      searchableText.includes("kroge");

    if (criteria.gearType === "passive_nets") {
      if (isTrawlSpecific && !isNetSpecific) return false;
      if (isTrapSpecific && !isNetSpecific) return false;
      if (isSeineSpecific && !isNetSpecific) return false;
    } else if (criteria.gearType === "active_trawl") {
      if (isNetSpecific && !isTrawlSpecific) return false;
      if (isTrapSpecific && !isTrawlSpecific) return false;
      if (isSeineSpecific && !isTrawlSpecific) return false;
    } else if (criteria.gearType === "seine") {
      if (isNetSpecific && !isSeineSpecific) return false;
      if (isTrawlSpecific && !isSeineSpecific) return false;
      if (isTrapSpecific && !isSeineSpecific) return false;
    } else if (criteria.gearType === "traps") {
      if (isNetSpecific && !isTrapSpecific) return false;
      if (isTrawlSpecific && !isTrapSpecific) return false;
      if (isSeineSpecific && !isTrapSpecific) return false;
    }
  }

  // 3. Sea Area Filtering
  if (criteria.seaArea !== "all") {
    const isNorthSeaSpecific = 
      searchableText.includes("nordsø") || 
      searchableText.includes("skagerrak") || 
      searchableText.includes("iv a") || 
      searchableText.includes("iv b") || 
      searchableText.includes("iv c");

    const isKattegatSpecific = 
      searchableText.includes("kattegat") || 
      searchableText.includes("iii a syd") || 
      searchableText.includes("sundet");

    const isBalticSpecific = 
      searchableText.includes("østersø") || 
      searchableText.includes("baltic") || 
      searchableText.includes("bornholm") || 
      searchableText.includes("bælterne") || 
      searchableText.includes("underområde 22") || 
      searchableText.includes("underområde 24") || 
      searchableText.includes("underområde 25");

    const isInshoreSpecific = 
      searchableText.includes("limfjord") || 
      searchableText.includes("fjord") || 
      searchableText.includes("kystnær") || 
      searchableText.includes("indre farvand") || 
      searchableText.includes("basislinje");

    if (criteria.seaArea === "north_sea") {
      if (isBalticSpecific && !isNorthSeaSpecific) return false;
      if (isKattegatSpecific && !isNorthSeaSpecific) return false;
      if (isInshoreSpecific && !isNorthSeaSpecific) return false;
    } else if (criteria.seaArea === "kattegat") {
      if (isNorthSeaSpecific && !isKattegatSpecific) return false;
      if (isBalticSpecific && !isKattegatSpecific) return false;
      if (isInshoreSpecific && !isKattegatSpecific) return false;
    } else if (criteria.seaArea === "baltic") {
      if (isNorthSeaSpecific && !isBalticSpecific) return false;
      if (isKattegatSpecific && !isBalticSpecific) return false;
      if (isInshoreSpecific && !isBalticSpecific) return false;
    } else if (criteria.seaArea === "inshore") {
      if (isNorthSeaSpecific && !isInshoreSpecific) return false;
      if (isBalticSpecific && !isInshoreSpecific) return false;
    }
  }

  return true;
}
