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

const t = getT();

describe("ConflictInspectorModal", () => {

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
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
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
  // formatConflictDescription rewrites exactly that one case into Danish, and the exported
  // brief is where a caseworker would otherwise see the raw English.
  function rawDescriptionConflict(): ConflictRecord {
    return {
      ...mockData.conflicts[0],
      description:
        "Potential conflict: one section creates an exception while another imposes an obligation.",
    };
  }

  function renderModal(conflict: ConflictRecord) {
    render(
      <ConflictInspectorModal
        conflict={conflict}
        data={mockData}
        onClose={vi.fn()}
        onSelectNode={vi.fn()}
        t={t}
      />
    );
  }

  it("copies both provisions, their documents and the citation context", async () => {
    const writeText = mockClipboard();
    renderModal(mockData.conflicts[0]);

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

  it("confirms the copy to the user", async () => {
    mockClipboard();
    renderModal(mockData.conflicts[0]);

    fireEvent.click(screen.getByRole("button", { name: /Kopiér notat/i }));

    expect(await screen.findByText(/Kopieret til udklipsholder!/i)).toBeInTheDocument();
  });

  it("rewrites the raw parser description into Danish in the exported brief", async () => {
    const writeText = mockClipboard();
    renderModal(rawDescriptionConflict());

    fireEvent.click(screen.getByRole("button", { name: /Kopiér notat/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const brief = writeText.mock.calls[0][0] as string;

    expect(brief).toContain("Potentiel regulatorisk modstrid");
    expect(brief).toContain("vedrørende EU 2023/2842 Art. 14");
    expect(brief).not.toContain("Potential conflict: one section creates an exception");
  });
});

describe("ConflictInspectorModal precedence callout", () => {
  function renderWithDocs(docs: GraphData["docs"]) {
    render(
      <ConflictInspectorModal
        conflict={mockData.conflicts[0]}
        data={{ ...mockData, docs }}
        onClose={vi.fn()}
        onSelectNode={vi.fn()}
        t={t}
      />
    );
  }

  const euAndNational = [
    { id: "doc0", label: "EU 2023/2842" },
    { id: "doc1", label: "BEK 1197/2025" },
  ];
  // doc1 is the citing side, so this is an EU regulation derogating from an EU regulation.
  const twoEuRegulations = [
    { id: "doc0", label: "EU 2023/2842" },
    { id: "doc1", label: "EU 1224/2009" },
  ];

  it("claims EU supremacy when a national order derogates from an EU regulation", () => {
    renderWithDocs(euAndNational);
    expect(screen.getByText(/EU-retlig forrang:/i)).toBeInTheDocument();
    expect(screen.getByText(/overtrumfer nationale bekendtgørelser/i)).toBeInTheDocument();
  });

  it("does not claim EU supremacy between two EU regulations", () => {
    renderWithDocs(twoEuRegulations);
    expect(screen.queryByText(/EU-retlig forrang:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Retslig afklaring påkrævet:/i)).toBeInTheDocument();
  });
});

describe("ConflictInspectorModal initial citation", () => {
  // Same shape as the parser's doc0_sec_17 record: the Danish derogation is emitted last.
  const multiSourceData: GraphData = {
    ...mockData,
    nodes: [
      ...mockData.nodes,
      {
        id: "doc0_sec_19",
        number: 19,
        label: "EU 2023/2842 Art. 19",
        title: "Undtagelser",
        doc: "doc0",
        theme: "Exceptions and Exemptions",
        body: "Undtagelser for visse fartoejer.",
      },
    ],
    conflicts: [
      {
        ...mockData.conflicts[0],
        citations: [
          {
            source: "doc0_sec_19",
            modality: "Exception",
            snippet: "Undtagelser for visse",
            context: "Undtagelser for visse fartoejer",
          },
          ...mockData.conflicts[0].citations,
        ],
      },
    ],
  };

  function renderMultiSource() {
    render(
      <ConflictInspectorModal
        conflict={multiSourceData.conflicts[0]}
        data={multiSourceData}
        onClose={vi.fn()}
        onSelectNode={vi.fn()}
        t={t}
      />
    );
  }

  it("opens on the national derogation rather than the first citation", () => {
    renderMultiSource();
    // The right pane heading is the active citation's source section.
    expect(screen.getAllByText(/BEK 1197\/2025 § 4/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/EU-retlig forrang:/i)).toBeInTheDocument();
  });

  it("re-gates the callout per citation when the user switches source", () => {
    renderMultiSource();
    fireEvent.click(screen.getByRole("button", { name: /EU 2023\/2842 Art\. 19/ }));
    expect(screen.getByText(/Retslig afklaring påkrævet:/i)).toBeInTheDocument();
    expect(screen.queryByText(/EU-retlig forrang:/i)).not.toBeInTheDocument();
  });
});
