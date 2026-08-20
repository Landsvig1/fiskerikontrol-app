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
    const hasLengthMention = /(?:meter|m\b|længde|størrelse|fartøj)/i.test(searchableText);
    
    if (hasLengthMention) {
      if (criteria.vesselLength === "under_8m") {
        const matchesUnder8 =
          searchableText.includes("under 8") ||
          searchableText.includes("< 8") ||
          searchableText.includes("<8") ||
          searchableText.includes("mindre end 8") ||
          searchableText.includes("kystfisker") ||
          searchableText.includes("under 10") ||
          searchableText.includes("< 10") ||
          searchableText.includes("under 12") ||
          searchableText.includes("< 12");
        const excludesUnder8 =
          searchableText.includes("over 12") ||
          searchableText.includes("> 12") ||
          searchableText.includes("mindst 12") ||
          searchableText.includes("over 15") ||
          searchableText.includes("over 18");
        if (excludesUnder8 && !matchesUnder8) return false;
      } else if (criteria.vesselLength === "8_12m") {
        const matches8to12 =
          searchableText.includes("8-12") ||
          searchableText.includes("8 til 12") ||
          searchableText.includes("10 m") ||
          searchableText.includes("10 meter") ||
          searchableText.includes("under 12") ||
          searchableText.includes("< 12") ||
          searchableText.includes("8 m") ||
          searchableText.includes("8 meter");
        const excludes8to12 =
          searchableText.includes("over 15") ||
          searchableText.includes("over 18") ||
          searchableText.includes("> 18");
        if (excludes8to12 && !matches8to12) return false;
      } else if (criteria.vesselLength === "12_18m") {
        const matches12to18 =
          searchableText.includes("12-18") ||
          searchableText.includes("12 til 18") ||
          searchableText.includes("12 m") ||
          searchableText.includes("12 meter") ||
          searchableText.includes("over 12") ||
          searchableText.includes("> 12") ||
          searchableText.includes("15 m") ||
          searchableText.includes("15 meter");
        const excludes12to18 = searchableText.includes("under 8") || searchableText.includes("< 8");
        if (excludes12to18 && !matches12to18) return false;
      } else if (criteria.vesselLength === "over_18m") {
        const matchesOver18 =
          searchableText.includes("18 m") ||
          searchableText.includes("18 meter") ||
          searchableText.includes("over 18") ||
          searchableText.includes("> 18") ||
          searchableText.includes("over 12") ||
          searchableText.includes("over 15") ||
          searchableText.includes("havgående");
        const excludesOver18 =
          searchableText.includes("under 8") ||
          searchableText.includes("< 8") ||
          searchableText.includes("under 10");
        if (excludesOver18 && !matchesOver18) return false;
      }
    }
  }

  // 2. Gear Type Filtering
  if (criteria.gearType !== "all") {
    const hasGearMention = /(?:garn|krog|trawl|vod|snurrevod|tejn|ruse|redskab|bommen)/i.test(searchableText);
    if (hasGearMention) {
      if (criteria.gearType === "passive_nets") {
        const matchesPassive =
          searchableText.includes("garn") ||
          searchableText.includes("krog") ||
          searchableText.includes("drivgarn") ||
          searchableText.includes("sættegarn") ||
          searchableText.includes("pinger") ||
          searchableText.includes("passiv");
        if (!matchesPassive) return false;
      } else if (criteria.gearType === "active_trawl") {
        const matchesTrawl =
          searchableText.includes("trawl") ||
          searchableText.includes("bomtrawl") ||
          searchableText.includes("pelagisk") ||
          searchableText.includes("bundtrawl") ||
          searchableText.includes("aktiv");
        if (!matchesTrawl) return false;
      } else if (criteria.gearType === "seine") {
        const matchesSeine =
          searchableText.includes("snurrevod") ||
          searchableText.includes("vod") ||
          searchableText.includes("not");
        if (!matchesSeine) return false;
      } else if (criteria.gearType === "traps") {
        const matchesTraps =
          searchableText.includes("tejn") ||
          searchableText.includes("ruse") ||
          searchableText.includes("kroge");
        if (!matchesTraps) return false;
      }
    }
  }

  // 3. Sea Area Filtering
  if (criteria.seaArea !== "all") {
    const hasAreaMention = /(?:nordsøen|skagerrak|kattegat|østersøen|bælterne|sundet|limfjorden|farvand|område|zone|ices)/i.test(searchableText);
    if (hasAreaMention) {
      if (criteria.seaArea === "north_sea") {
        const matchesNorthSea =
          searchableText.includes("nordsø") ||
          searchableText.includes("skagerrak") ||
          searchableText.includes("iv a") ||
          searchableText.includes("iv b") ||
          searchableText.includes("iii a");
        if (!matchesNorthSea) return false;
      } else if (criteria.seaArea === "kattegat") {
        const matchesKattegat =
          searchableText.includes("kattegat") ||
          searchableText.includes("iii a") ||
          searchableText.includes("sundet");
        if (!matchesKattegat) return false;
      } else if (criteria.seaArea === "baltic") {
        const matchesBaltic =
          searchableText.includes("østersø") ||
          searchableText.includes("baltic") ||
          searchableText.includes("bornholm") ||
          searchableText.includes("bælterne") ||
          searchableText.includes("danske bælter");
        if (!matchesBaltic) return false;
      } else if (criteria.seaArea === "inshore") {
        const matchesInshore =
          searchableText.includes("limfjord") ||
          searchableText.includes("fjord") ||
          searchableText.includes("kystnær") ||
          searchableText.includes("indre farvand") ||
          searchableText.includes("søterritoriet");
        if (!matchesInshore) return false;
      }
    }
  }

  return true;
}
