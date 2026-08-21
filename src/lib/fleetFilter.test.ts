import { describe, it, expect } from "vitest";
import { matchesFleetCriteria, DEFAULT_FLEET_CRITERIA, FleetFilterCriteria } from "./fleetFilter";
import { GraphNode } from "./types";

function mockNode(label: string, title: string, body: string, theme: string = "Control"): GraphNode {
  return {
    id: `doc1_${label}`,
    number: 0,
    doc: "doc1",
    label,
    title,
    body,
    theme,
    isCrossDoc: false,
    citationsCount: 0,
  };
}

describe("matchesFleetCriteria", () => {
  it("returns true for default criteria (all)", () => {
    const node = mockNode("Art. 9", "Overvågning", "Fartøjer skal føre VMS position.");
    expect(matchesFleetCriteria(node, DEFAULT_FLEET_CRITERIA)).toBe(true);
  });

  it("filters by vessel length correctly", () => {
    const smallVesselNode = mockNode("Art. 14", "Logbog", "Fartøjer under 8 meter er fritaget for elektronisk logbog.");
    const largeVesselNode = mockNode("Art. 9", "VMS", "Fartøjer over 15 meter skal have satellitsporing.");

    const under8Criteria: FleetFilterCriteria = {
      vesselLength: "under_8m",
      gearType: "all",
      seaArea: "all",
    };

    const over18Criteria: FleetFilterCriteria = {
      vesselLength: "over_18m",
      gearType: "all",
      seaArea: "all",
    };

    expect(matchesFleetCriteria(smallVesselNode, under8Criteria)).toBe(true);
    expect(matchesFleetCriteria(largeVesselNode, under8Criteria)).toBe(false);

    expect(matchesFleetCriteria(largeVesselNode, over18Criteria)).toBe(true);
    expect(matchesFleetCriteria(smallVesselNode, over18Criteria)).toBe(false);
  });

  it("filters by gear type correctly", () => {
    const netNode = mockNode("§ 12", "Garnredskaber", "Der skal anvendes akustiske pingere på sættegarn.");
    const trawlNode = mockNode("§ 45", "Trawlfiskeri", "Maskestørrelsen for bundtrawl skal være mindst 120 mm.");

    const passiveCriteria: FleetFilterCriteria = {
      vesselLength: "all",
      gearType: "passive_nets",
      seaArea: "all",
    };

    const trawlCriteria: FleetFilterCriteria = {
      vesselLength: "all",
      gearType: "active_trawl",
      seaArea: "all",
    };

    expect(matchesFleetCriteria(netNode, passiveCriteria)).toBe(true);
    expect(matchesFleetCriteria(trawlNode, passiveCriteria)).toBe(false);

    expect(matchesFleetCriteria(trawlNode, trawlCriteria)).toBe(true);
    expect(matchesFleetCriteria(netNode, trawlCriteria)).toBe(false);
  });

  it("filters by sea area correctly", () => {
    const kattegatNode = mockNode("§ 3", "Kattegat regler", "I Kattegat er fiskeri efter jomfruhummer reguleret.");
    const balticNode = mockNode("Art. 8", "Østersøen", "Fiskeri i den vestlige Østersø er omfattet af torskestop.");

    const kattegatCriteria: FleetFilterCriteria = {
      vesselLength: "all",
      gearType: "all",
      seaArea: "kattegat",
    };

    const balticCriteria: FleetFilterCriteria = {
      vesselLength: "all",
      gearType: "all",
      seaArea: "baltic",
    };

    expect(matchesFleetCriteria(kattegatNode, kattegatCriteria)).toBe(true);
    expect(matchesFleetCriteria(balticNode, kattegatCriteria)).toBe(false);

    expect(matchesFleetCriteria(balticNode, balticCriteria)).toBe(true);
    expect(matchesFleetCriteria(kattegatNode, balticCriteria)).toBe(false);
  });
});
