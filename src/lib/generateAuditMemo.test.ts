import { describe, it, expect } from "vitest";
import { generateAuditMemoMarkdown } from "./generateAuditMemo";
import { GraphData } from "./types";

describe("generateAuditMemoMarkdown", () => {
  it("generates structured markdown memo with authority header and summary", () => {
    const mockData: GraphData = {
      docs: [
        { id: "doc0", label: "EU 2023/2842" },
        { id: "doc1", label: "BEK 1197/2025" },
      ],
      nodes: [
        {
          id: "eu_art9",
          doc: "EU 2023/2842",
          label: "Art. 9",
          title: "VMS Sporing",
          body: "Fartøjer skal have VMS installeret.",
          theme: "Obligation",
          isCrossDoc: true,
          citationsCount: 1,
        },
        {
          id: "bek_sec3",
          doc: "BEK 1197/2025",
          label: "§ 3",
          title: "Undtagelser",
          body: "Uanset regler kan fartøjer undtages.",
          theme: "Exception",
          isCrossDoc: true,
          citationsCount: 1,
        },
      ],
      links: [
        {
          source: "eu_art9",
          target: "bek_sec3",
          targetLabel: "§ 3",
          rawMatch: "§ 3",
          modality: "Exception",
          isCrossDoc: true,
        },
      ],
      overlaps: [],
      conflicts: [],
    };

    const memo = generateAuditMemoMarkdown({
      data: mockData,
      lang: "da",
      caseworkerName: "Test Sagsbehandler",
    });

    expect(memo).toContain("JURIDISK TILSYNSNOTAT");
    expect(memo).toContain("EU 2023/2842");
    expect(memo).toContain("BEK 1197/2025");
    expect(memo).toContain("Test Sagsbehandler");
    expect(memo).toContain("EU-forordninger forrang");
  });
});
