import { describe, it, expect } from "vitest";
import { generateAuditMemoMarkdown } from "./generateAuditMemo";
import { GraphData } from "./types";

function mockData(): GraphData {
  return {
    docs: [
      { id: "doc0", label: "EU 2023/2842" },
      { id: "doc1", label: "BEK 1197/2025" },
    ],
    nodes: [
      {
        id: "doc0_sec_9",
        number: 9,
        doc: "doc0",
        label: "Art. 9",
        title: "VMS Sporing",
        body: "Fartøjer skal have VMS installeret.",
        theme: "Overvågning & VMS",
      },
      {
        id: "doc1_sec_3",
        number: 3,
        doc: "doc1",
        label: "§ 3",
        title: "Undtagelser",
        body: "Uanset regler kan fartøjer undtages.",
        theme: "Overvågning & VMS",
      },
    ],
    links: [
      {
        source: "doc1_sec_3",
        target: "doc0_sec_9",
        modality: "Exception",
        isCrossDoc: true,
      },
    ],
    overlaps: [],
    conflicts: [
      {
        target: "doc0_sec_9",
        modalities: ["Obligation", "Exception"],
        description: "Modstridende modaliteter på samme bestemmelse.",
        citations: [
          {
            source: "doc1_sec_3",
            modality: "Exception",
            snippet: "Uanset regler kan fartøjer undtages.",
            context: "Uanset regler kan fartøjer undtages.",
          },
        ],
      },
    ],
  };
}

describe("generateAuditMemoMarkdown", () => {
  it("generates structured markdown memo with authority header and summary", () => {
    const memo = generateAuditMemoMarkdown({
      data: mockData(),
      lang: "da",
      caseworkerName: "Test Sagsbehandler",
    });

    expect(memo).toContain("JURIDISK TILSYNSNOTAT");
    expect(memo).toContain("EU 2023/2842");
    expect(memo).toContain("BEK 1197/2025");
    expect(memo).toContain("Test Sagsbehandler");
  });

  it("reports conflicts from data.conflicts rather than re-deriving them from links", () => {
    const memo = generateAuditMemoMarkdown({ data: mockData(), lang: "da" });

    expect(memo).toContain("Identificerede modsigelser / konflikter:** 1");
    expect(memo).toContain("§ 3 ⟷ Art. 9");
    expect(memo).toContain("EU-forordninger forrang");
  });

  it("counts cross-document citations from the isCrossDoc flag", () => {
    const memo = generateAuditMemoMarkdown({ data: mockData(), lang: "da" });

    expect(memo).toContain("Krydsreferencer mellem dokumenter:** 1");
  });

  it("reports no conflicts when the parser found none", () => {
    const data = mockData();
    data.conflicts = [];

    const memo = generateAuditMemoMarkdown({ data, lang: "da" });

    expect(memo).toContain("Ingen direkte retskonflikter");
  });

  it("keeps a conflict when only one side matches the fleet criteria", () => {
    const data = mockData();
    // Target is trawl-specific (out of scope for a gillnet operator), source stays generic.
    data.nodes[0].body = "Fartøjer med bomtrawl skal have VMS installeret.";

    const memo = generateAuditMemoMarkdown({
      data,
      lang: "da",
      criteria: { vesselLength: "all", gearType: "passive_nets", seaArea: "all" },
    });

    expect(memo).toContain("Identificerede modsigelser / konflikter:** 1");
  });

  it("drops conflicts where neither side matches the fleet criteria", () => {
    const data = mockData();
    data.nodes[0].body = "Fartøjer med bomtrawl skal have VMS installeret.";
    data.nodes[1].body = "Uanset regler kan fartøjer med bomtrawl undtages.";

    const memo = generateAuditMemoMarkdown({
      data,
      lang: "da",
      criteria: { vesselLength: "all", gearType: "passive_nets", seaArea: "all" },
    });

    expect(memo).toContain("Ingen direkte retskonflikter");
  });
});
