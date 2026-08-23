import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConflictsView } from "./ConflictsView";
import type { GraphData, GraphNode } from "@/lib/types";
import { getT } from "@/lib/i18n";

const t = getT();

function node(id: string, doc: string, label: string, body: string): GraphNode {
  return { id, number: 1, label, title: "", doc, theme: "Obligations and Duties", body };
}

// Mirrors the shape the parser emits for doc0_sec_17 in the
// EU 1224/2009 + BEK 1197/2025 corpus: two EU citations scanned before the Danish
// derogation, so citations[0] is EU and the real precedence question is citations[2].
const mockData: GraphData = {
  docs: [
    { id: "doc0", label: "EU 1224/2009" },
    { id: "doc1", label: "BEK 1197/2025" },
  ],
  nodes: [
    node("doc0_sec_17", "doc0", "EU 1224/2009 Art. 17", "Foerere skal indsende forhaandsanmeldelse."),
    node("doc0_sec_19", "doc0", "EU 1224/2009 Art. 19", "Undtagelser for visse fartoejer."),
    node("doc0_sec_115", "doc0", "EU 1224/2009 Art. 115", "Medlemsstaterne skal foere kontrol."),
    node("doc1_sec_4", "doc1", "BEK 1197/2025 § 4", "Fartoejer under 12 meter fritages."),
  ],
  links: [],
  overlaps: [],
  conflicts: [
    {
      target: "doc0_sec_17",
      modalities: ["Obligation", "Exception"],
      description: "Modstrid mellem forhaandsanmeldelse og national undtagelse.",
      citations: [
        { source: "doc0_sec_19", modality: "Exception", snippet: "Undtagelser for visse", context: "" },
        { source: "doc0_sec_115", modality: "Obligation", snippet: "skal foere kontrol", context: "" },
        { source: "doc1_sec_4", modality: "Obligation", snippet: "fritages", context: "" },
      ],
    },
  ],
};

function renderView(data: GraphData) {
  render(
    <ConflictsView
      data={data}
      setSelectedNode={vi.fn()}
      setActiveTab={vi.fn()}
      onInspectConflict={vi.fn()}
      t={t}
    />
  );
}

describe("ConflictsView precedence badge", () => {
  it("badges EU supremacy from the national citation, not from the first one emitted", () => {
    renderView(mockData);
    expect(screen.getByText(/EU-forordning har forrang/)).toBeInTheDocument();
    expect(screen.queryByText(/Retslig afklaring påkrævet/)).not.toBeInTheDocument();
  });

  it("names the same pair in the heading that the badge was decided from", () => {
    renderView(mockData);
    // The heading's derogating side must be the Danish order, otherwise the card claims
    // EU supremacy while naming an EU section as the derogation.
    expect(screen.getAllByText("BEK 1197/2025 § 4").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("EU 1224/2009 Art. 19")).not.toBeInTheDocument();
  });

  it("falls back to the first citation when no source is a national derogation", () => {
    const euOnly: GraphData = {
      ...mockData,
      conflicts: [
        {
          ...mockData.conflicts[0],
          citations: mockData.conflicts[0].citations.slice(0, 2),
        },
      ],
    };
    renderView(euOnly);
    expect(screen.getByText(/Retslig afklaring påkrævet/)).toBeInTheDocument();
    expect(screen.getAllByText("EU 1224/2009 Art. 19").length).toBeGreaterThanOrEqual(1);
  });
});
