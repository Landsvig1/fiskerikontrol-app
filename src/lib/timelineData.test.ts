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
});
