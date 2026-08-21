import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConflictInspectorModal } from "./ConflictInspectorModal";
import type { ConflictRecord, GraphData } from "@/lib/types";
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
    expect(screen.getByText("skal")).toHaveClass("bg-sky-100");
    expect(screen.getByText("fritages")).toHaveClass("bg-amber-100");
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

describe("ConflictInspectorModal language handling", () => {
  it("renders the English pane labels and actions when lang is en", () => {
    render(
      <ConflictInspectorModal
        conflict={mockData.conflicts[0]}
        data={mockData}
        onClose={vi.fn()}
        onSelectNode={vi.fn()}
        t={getT("en")}
        lang="en"
      />
    );

    expect(screen.getByText(/Base Provision \/ Requirement/i)).toBeInTheDocument();
    expect(screen.getByText(/Exception \/ Conflicting Provision/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy brief/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show in graph/i })).toBeInTheDocument();
    // The header dismiss icon and the footer button share the closeModal label.
    expect(screen.getAllByRole("button", { name: /^Close$/i })).toHaveLength(2);
  });
});

describe("ConflictInspectorModal copy path", () => {
  function mockClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    return writeText;
  }

  // The parser emits this English sentence for every rule-versus-exception collision.
  // It is the only description that formatConflictDescription rewrites, so it is what
  // makes the lang prop observable in the exported brief.
  function rawDescriptionConflict(): ConflictRecord {
    return {
      ...mockData.conflicts[0],
      description:
        "Potential conflict: one section creates an exception while another imposes an obligation.",
    };
  }

  function renderModal(conflict: ConflictRecord, lang: "da" | "en") {
    render(
      <ConflictInspectorModal
        conflict={conflict}
        data={mockData}
        onClose={vi.fn()}
        onSelectNode={vi.fn()}
        t={getT(lang)}
        lang={lang}
      />
    );
  }

  it("copies both provisions, their documents and the citation context", async () => {
    const writeText = mockClipboard();
    renderModal(mockData.conflicts[0], "da");

    fireEvent.click(screen.getByRole("button", { name: /Kopiér notat/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const brief = writeText.mock.calls[0][0] as string;

    expect(brief).toContain("Target: EU 2023/2842 Art. 14 (EU 2023/2842)");
    expect(brief).toContain("Kilde: BEK 1197/2025 § 4 (BEK 1197/2025)");
    expect(brief).toContain("Modalitet: Exception");
    expect(brief).toContain("Uanset artikel 14 fritages fartøjer");
    expect(brief).toContain("Føreren af et EU-fiskerfartøj");
    expect(brief).toContain("fartøjer under 12 meter");
  });

  it("confirms the copy in the active language", async () => {
    mockClipboard();
    renderModal(mockData.conflicts[0], "en");

    fireEvent.click(screen.getByRole("button", { name: /Copy brief/i }));

    expect(await screen.findByText(/Copied to clipboard!/i)).toBeInTheDocument();
  });

  it("rewrites a raw parser description into Danish in the exported brief", async () => {
    const writeText = mockClipboard();
    renderModal(rawDescriptionConflict(), "da");

    fireEvent.click(screen.getByRole("button", { name: /Kopiér notat/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const brief = writeText.mock.calls[0][0] as string;

    expect(brief).toContain("Potentiel regulatorisk modstrid");
    expect(brief).toContain("vedrørende EU 2023/2842 Art. 14");
    expect(brief).not.toContain("Potential conflict: one section creates an exception");
  });

  it("keeps the English description in the exported brief when lang is en", async () => {
    const writeText = mockClipboard();
    renderModal(rawDescriptionConflict(), "en");

    fireEvent.click(screen.getByRole("button", { name: /Copy brief/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const brief = writeText.mock.calls[0][0] as string;

    expect(brief).toContain("Potential conflict: one section creates an exception");
    expect(brief).not.toContain("Potentiel regulatorisk modstrid");
  });
});
