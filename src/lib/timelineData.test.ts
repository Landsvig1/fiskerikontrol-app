import { describe, it, expect } from "vitest";
import { STATUTORY_MILESTONES, getTimelineForCorpus } from "./timelineData";
import { GraphData } from "./types";

describe("timelineData", () => {
  it("contains valid statutory milestones with required fields", () => {
    expect(STATUTORY_MILESTONES.length).toBeGreaterThanOrEqual(5);

    for (const m of STATUTORY_MILESTONES) {
      expect(m.id).toBeTruthy();
      expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.titleDa).toBeTruthy();
      expect(m.titleEn).toBeTruthy();
      expect(m.docCode).toBeTruthy();
      expect(["in_force", "upcoming", "transitional"]).toContain(m.status);
    }
  });

  it("derives in_force / upcoming from the date rather than the stored status", () => {
    const empty: GraphData = { docs: [], nodes: [], links: [], overlaps: [], conflicts: [] };
    const milestones = [
      { ...STATUTORY_MILESTONES[0], id: "past", date: "2026-07-01", status: "upcoming" as const },
      { ...STATUTORY_MILESTONES[0], id: "future", date: "2028-01-01", status: "in_force" as const },
    ];

    const result = getTimelineForCorpus(empty, milestones, new Date("2026-08-29T00:00:00Z"));

    expect(result.find((m) => m.id === "past")?.status).toBe("in_force");
    expect(result.find((m) => m.id === "future")?.status).toBe("upcoming");
  });

  it("leaves a transitional status alone, it is a legal characterisation not a date", () => {
    const empty: GraphData = { docs: [], nodes: [], links: [], overlaps: [], conflicts: [] };
    const milestones = [
      { ...STATUTORY_MILESTONES[0], id: "trans", date: "2020-01-01", status: "transitional" as const },
    ];

    const result = getTimelineForCorpus(empty, milestones, new Date("2026-08-29T00:00:00Z"));

    expect(result[0].status).toBe("transitional");
  });

  it("derives status for milestones that survive the corpus filter", () => {
    const data: GraphData = {
      docs: [{ id: "doc0", label: "BEK 1144/2025" }],
      nodes: [], links: [], overlaps: [], conflicts: [],
    };

    const result = getTimelineForCorpus(data, STATUTORY_MILESTONES, new Date("2027-01-01T00:00:00Z"));

    // Every milestone dated before the reference date reads as in force, whatever the
    // hand-written literal said.
    for (const m of result) {
      if (m.status === "transitional") continue;
      const expected = new Date(`${m.date}T00:00:00Z`) <= new Date("2027-01-01T00:00:00Z");
      expect(m.status).toBe(expected ? "in_force" : "upcoming");
    }
  });

  it("filters milestones matching loaded documents in GraphData", () => {
    const mockData: GraphData = {
      docs: [
        { id: "doc0", label: "EU 2023/2842" },
      ],
      nodes: [],
      links: [],
      overlaps: [],
      conflicts: [],
    };

    const milestones = getTimelineForCorpus(mockData);
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones.some((m) => m.docCode.includes("2023/2842"))).toBe(true);
  });

  it("excludes milestones whose source act is not in the loaded corpus", () => {
    const mockData: GraphData = {
      docs: [{ id: "doc0", label: "EU 2023/2842" }],
      nodes: [],
      links: [],
      overlaps: [],
      conflicts: [],
    };

    const milestones = getTimelineForCorpus(mockData);
    expect(milestones.some((m) => m.docCode.includes("1144"))).toBe(false);
  });

  it("includes a national milestone once its bekendtgørelse is loaded", () => {
    const mockData: GraphData = {
      docs: [
        { id: "doc0", label: "EU 2023/2842" },
        { id: "doc1", label: "BEK 1144/2025" },
      ],
      nodes: [],
      links: [],
      overlaps: [],
      conflicts: [],
    };

    const milestones = getTimelineForCorpus(mockData);
    expect(milestones.some((m) => m.docCode.includes("1144"))).toBe(true);
  });

  it("does not confuse two bekendtgørelser sharing a year", () => {
    const mockData: GraphData = {
      docs: [{ id: "doc0", label: "BEK 1197/2025" }],
      nodes: [],
      links: [],
      overlaps: [],
      conflicts: [],
    };

    const milestones = getTimelineForCorpus(mockData);
    expect(milestones.some((m) => m.docCode.includes("1144"))).toBe(false);
  });

  it("shows the full statutory calendar when no documents are loaded", () => {
    const mockData: GraphData = {
      docs: [],
      nodes: [],
      links: [],
      overlaps: [],
      conflicts: [],
    };

    expect(getTimelineForCorpus(mockData)).toHaveLength(STATUTORY_MILESTONES.length);
  });
});
