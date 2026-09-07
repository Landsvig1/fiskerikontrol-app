import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let currentQuery = "";
const replace = vi.fn((href: string) => {
  currentQuery = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
});

vi.mock("next/navigation", () => {
  let router: ReturnType<typeof makeRouter> | null = null;
  const makeRouter = () => ({ replace, push: vi.fn(), refresh: vi.fn(), back: vi.fn() });
  return {
    useRouter: () => (router ??= makeRouter()),
    useSearchParams: () => new URLSearchParams(currentQuery),
  };
});

import Home from "./page";

describe("Home Matrix Application", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Fiskeriets Matrix with all 4 columns directly", () => {
    render(<Home />);

    expect(screen.getByText(/Fiskeriets Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Aktør \/ Fartøjsklasse/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Operationel Hændelse/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. IT-System & Datastrøm/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Regelsæt & Hjemmel/i)).toBeInTheDocument();
  });

  it("renders the 6 quick administrative scenarios", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: /Mikro-kystfisker/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Konsumkutter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pelagisk Trawler/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vejereform/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Automatiseret Krydskontrol/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Det Store 2028 Skifte/i })).toBeInTheDocument();
  });

  it("allows selecting a node and displays the dossier panel", () => {
    const { rerender } = render(<Home />);

    const microCards = screen.getAllByText(/Fartøj < 8m \(Mikro-kystfisker\)/i);
    fireEvent.click(microCards[0]);

    rerender(<Home />);
    expect(screen.getByRole("button", { name: /Kopier til Sagsnotat/i })).toBeInTheDocument();
  });

  it("switches to 2028 timeline when clicking 2028 button", () => {
    render(<Home />);

    const btn2028 = screen.getByRole("button", { name: /2028: Målarkitektur/i });
    fireEvent.click(btn2028);

    expect(replace).toHaveBeenCalledWith(expect.stringContaining("yr=2028"), { scroll: false });
  });

  it("filters cards when typing in the search box", () => {
    render(<Home />);

    const searchInput = screen.getByPlaceholderText(/Hurtigsøgning/i);
    fireEvent.change(searchInput, { target: { value: "CCTV" } });

    expect(screen.getAllByText(/REM \/ CCTV/i).length).toBeGreaterThanOrEqual(1);
  });

  it("clicking a scenario activates the corresponding node and timeline", () => {
    render(<Home />);

    const cctvScenario = screen.getByRole("button", { name: /Pelagisk Trawler/i });
    fireEvent.click(cctvScenario);

    expect(replace).toHaveBeenCalledWith(expect.stringContaining("node=actor_large"), { scroll: false });
  });

  it("opens article inspector modal when clicking ? button on a regulation card", () => {
    render(<Home />);

    // Find question mark buttons for regulation cards
    const questionButtons = screen.getAllByRole("button", { name: /Se artikler/i });
    expect(questionButtons.length).toBeGreaterThan(0);

    // Click the first question button (e.g. EU 1224/2009 or BEK 1144)
    fireEvent.click(questionButtons[0]);

    // Modal dialog should be in the document
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Retsgrundlag & Paragraffer/i)).toBeInTheDocument();
    expect(screen.getByText(/Relevante artikler for kontrolkæden/i)).toBeInTheDocument();

    // Close button works
    const closeBtn = screen.getByRole("button", { name: /^Luk$/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes article inspector modal on Escape key", () => {
    render(<Home />);

    const questionButtons = screen.getAllByRole("button", { name: /Se artikler/i });
    fireEvent.click(questionButtons[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
