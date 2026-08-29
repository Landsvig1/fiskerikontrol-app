import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GraphData } from "@/lib/types";

const emptyData: GraphData = {
  docs: [{ id: "doc0", label: "EU 1224/2009" }],
  nodes: [],
  links: [],
  overlaps: [],
  conflicts: [],
};

// The dashboard is the tab the app opens on, so a throw here is the worst case: without a
// boundary it takes the header and the tab bar down with it.
vi.mock("@/components/views/DashboardView", () => ({
  DashboardView: () => {
    throw new Error("Cannot read properties of undefined (reading 'label')");
  },
}));

vi.mock("@/components/views/BrowseView", () => ({
  BrowseView: () => <p>Browse-visningen virker</p>,
}));

// The real upload screen posts a PDF to the parse route; this stands in for a finished parse.
vi.mock("@/components/UploadScreen", () => ({
  UploadScreen: ({ onSuccess }: { onSuccess: (data: GraphData) => void }) => (
    <button onClick={() => onSuccess(emptyData)}>Indlæs testkorpus</button>
  ),
}));

import Home from "./page";

describe("Home view error boundaries", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the header and tab bar usable when a view throws", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Indlæs testkorpus/i }));

    // The failing view is contained.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Denne visning kunne ikke indlæses")).toBeInTheDocument();

    // The rest of the page survived.
    expect(screen.getByText("LexGraph")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Eksportér Tilsynsnotat/i })).toBeInTheDocument();

    // The explainer is reachable from the header once a corpus is loaded, and opens in a
    // new tab so the in-memory analysis survives the trip.
    const about = screen.getByRole("link", { name: /Hvad er LexGraph\?/i });
    expect(about).toHaveAttribute("href", "/about");
    expect(about).toHaveAttribute("target", "_blank");

    // And a different tab still renders its own view.
    fireEvent.click(screen.getByRole("button", { name: /Søg & Slå Op/i }));
    expect(screen.getByText("Browse-visningen virker")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
