import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConflictInspectorModal } from "./ConflictInspectorModal";
import { GraphData } from "@/app/page";
import { getT } from "@/lib/i18n";

const mockData: GraphData = {
  docs: [
    { id: "doc0", label: "EU 2023/2842" },
    { id: "doc1", label: "BEK 1197/2025" },
  ],
  nodes: [
    {
      id: "doc0_sec_14",
      number: 14,
      label: "EU 2023/2842 Art. 14",
      title: "Elektronisk logbog",
      doc: "doc0",
      theme: "Obligations and Duties",
      body: "Føreren af et EU-fiskerfartøj skal føre en elektronisk logbog over alle fiskeriaktiviteter.",
    },
    {
      id: "doc1_sec_4",
      number: 4,
      label: "BEK 1197/2025 § 4",
      title: "Undtagelse for kystfiskeri",
      doc: "doc1",
      theme: "Exceptions and Exemptions",
      body: "Uanset artikel 14 fritages fartøjer under 12 meter fra pligten til at indsende elektronisk logbog.",
    },
  ],
  links: [],
  overlaps: [],
  conflicts: [
    {
      target: "doc0_sec_14",
      modalities: ["Obligation", "Exception"],
      description: "Modstrid mellem elektronisk logbogskrav og national undtagelse for kystfartøjer.",
      citations: [
        {
          source: "doc1_sec_4",
          modality: "Exception",
          snippet: "Uanset artikel 14 fritages fartøjer",
          context: "Uanset artikel 14 fritages fartøjer under 12 meter fra pligten",
        },
      ],
    },
  ],
};

describe("ConflictInspectorModal", () => {
  const t = getT("da");

  it("renders dual-pane modal with base provision and derogating provision", () => {
    const handleClose = vi.fn();
    const handleSelectNode = vi.fn();

    render(
      <ConflictInspectorModal
        conflict={mockData.conflicts[0]}
        data={mockData}
        onClose={handleClose}
        onSelectNode={handleSelectNode}
        t={t}
        lang="da"
      />
    );

    // Assert headings
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText(/EU 2023\/2842 Art\. 14/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/BEK 1197\/2025 § 4/i)).toBeInTheDocument();

    // Assert body texts
    expect(screen.getByText(/Føreren af et EU-fiskerfartøj/i)).toBeInTheDocument();
    expect(screen.getByText(/fartøjer under 12 meter/i)).toBeInTheDocument();

    // Assert keywords are highlighted
    expect(screen.getByText("skal")).toHaveClass("bg-[#38bdf8]/20");
    expect(screen.getByText("fritages")).toHaveClass("bg-[#ef4444]/25");
  });

  it("triggers onSelectNode and onClose when 'Vis i graf' is clicked", () => {
    const handleClose = vi.fn();
    const handleSelectNode = vi.fn();

    render(
      <ConflictInspectorModal
        conflict={mockData.conflicts[0]}
        data={mockData}
        onClose={handleClose}
        onSelectNode={handleSelectNode}
        t={t}
        lang="da"
      />
    );

    const showInGraphButton = screen.getByRole("button", { name: /Vis i graf/i });
    fireEvent.click(showInGraphButton);

    expect(handleSelectNode).toHaveBeenCalledWith(mockData.nodes[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it("closes modal on Escape key press", () => {
    const handleClose = vi.fn();
    const handleSelectNode = vi.fn();

    render(
      <ConflictInspectorModal
        conflict={mockData.conflicts[0]}
        data={mockData}
        onClose={handleClose}
        onSelectNode={handleSelectNode}
        t={t}
        lang="da"
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
