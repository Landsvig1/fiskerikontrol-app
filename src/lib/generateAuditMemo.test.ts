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
        type: "citation",
        modality: "Exception",
        snippet: "Uanset regler kan fartøjer undtages.",
        context: "Uanset regler kan fartøjer undtages.",
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

  // A conflict survives the fleet filter when EITHER side is in scope: a gillnet operator
  // still needs to see a trawl-specific derogation from a rule that binds them, and vice
  // versa. nodes[0] is the cited target (Art. 9), nodes[1] the citing source (§ 3).
  // "bomtrawl" puts a section out of scope for the passive_nets segment.
  const passiveNets = { vesselLength: "all", gearType: "passive_nets", seaArea: "all" } as const;

  it("keeps a conflict when only the source section matches the fleet criteria", () => {
    const data = mockData();
    data.nodes[0].body = "Fartøjer med bomtrawl skal have VMS installeret.";

    const memo = generateAuditMemoMarkdown({ data, lang: "da", criteria: passiveNets });

    expect(memo).toContain("Identificerede modsigelser / konflikter:** 1");
    expect(memo).toContain("§ 3 ⟷ Art. 9");
  });

  it("keeps a conflict when only the target section matches the fleet criteria", () => {
    const data = mockData();
    data.nodes[1].body = "Uanset regler kan fartøjer med bomtrawl undtages.";

    const memo = generateAuditMemoMarkdown({ data, lang: "da", criteria: passiveNets });

    expect(memo).toContain("Identificerede modsigelser / konflikter:** 1");
    expect(memo).toContain("§ 3 ⟷ Art. 9");
  });

  it("drops conflicts where neither side matches the fleet criteria", () => {
    const data = mockData();
    data.nodes[0].body = "Fartøjer med bomtrawl skal have VMS installeret.";
    data.nodes[1].body = "Uanset regler kan fartøjer med bomtrawl undtages.";

    const memo = generateAuditMemoMarkdown({ data, lang: "da", criteria: passiveNets });

    expect(memo).toContain("Ingen direkte retskonflikter");
    expect(memo).not.toContain("§ 3 ⟷ Art. 9");
  });
});

describe("jurisdictional claims in the memo", () => {
  function euOnlyData(): GraphData {
    const d = mockData();
    // Both documents are EU regulations, which is exactly the bundled demo path.
    d.docs = [
      { id: "doc0", label: "EU 1224/2009" },
      { id: "doc1", label: "EU 2023/2842" },
    ];
    return d;
  }

  it("does not assert EU supremacy for a conflict between two EU regulations", () => {
    const memo = generateAuditMemoMarkdown({ data: euOnlyData(), lang: "da" });
    expect(memo).not.toContain("forrang frem for nationale bekendtgørelser");
    expect(memo).toContain("Retslig afklaring påkrævet");
  });

  it("does not assert EU supremacy in the English memo for two EU regulations", () => {
    const memo = generateAuditMemoMarkdown({ data: euOnlyData(), lang: "en" });
    expect(memo).not.toContain("EU legal supremacy");
    expect(memo).toContain("Clarification required");
  });

  it("still asserts EU supremacy when a national order conflicts with an EU regulation", () => {
    const memo = generateAuditMemoMarkdown({ data: mockData(), lang: "da" });
    expect(memo).toContain("forrang frem for nationale bekendtgørelser");
  });

  it("reports the conflict count as distinct target sections, not expanded citation pairs", () => {
    const data = mockData();
    // One conflict record, two citing sections: the headline count must stay 1.
    data.nodes.push({
      id: "doc1_sec_4",
      number: 4,
      doc: "doc1",
      label: "§ 4",
      title: "Yderligere undtagelse",
      body: "Uanset regler kan fartøjer fritages.",
      theme: "Overvågning & VMS",
    });
    data.conflicts[0].citations.push({
      source: "doc1_sec_4",
      modality: "Exception",
      snippet: "Uanset regler kan fartøjer fritages.",
      context: "Uanset regler kan fartøjer fritages.",
    });

    const memo = generateAuditMemoMarkdown({ data, lang: "da" });
    expect(memo).toContain("**Identificerede modsigelser / konflikter:** 1");
    expect(memo).toContain("**Berørte henvisningspar:** 2");
  });
});
