import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { GraphData } from "@/lib/types";

const emptyData: GraphData = {
  docs: [{ id: "doc0", label: "EU 1224/2009" }],
  nodes: [],
  links: [],
  overlaps: [],
  conflicts: [],
};

// A working stand-in for the App Router. It holds the query string in a variable that
// router.replace writes and useSearchParams reads, so a test can assert what the app put in
// the URL and, just as importantly, that the app reads its own screen back out of it.
let currentQuery = "";
const replace = vi.fn((href: string) => {
  currentQuery = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
});

// One router object for the life of the file, matching the App Router, which hands out a
// stable instance from context. The setter-identity guarantee below rests on that:
// setUrlState depends on [router], so a router rebuilt per render would defeat it.
vi.mock("next/navigation", () => {
  // Built on first use, not in the factory body: vi.mock is hoisted above the `replace`
  // declaration, so touching it eagerly would read a temporal-dead-zone binding. Cached
  // afterwards so the instance is stable, matching the App Router, which hands out one
  // router from context. The setter-identity guarantee rests on that: setUrlState depends
  // on [router], so a router rebuilt per render would defeat it.
  let router: ReturnType<typeof makeRouter> | null = null;
  const makeRouter = () => ({ replace, push: vi.fn(), refresh: vi.fn(), back: vi.fn() });
  return {
    useRouter: () => (router ??= makeRouter()),
    useSearchParams: () => new URLSearchParams(currentQuery),
  };
});

// The dashboard is the tab the app opens on, so a throw here is the worst case: without a
// boundary it takes the header and the tab bar down with it.
vi.mock("@/components/views/DashboardView", () => ({
  DashboardView: () => {
    throw new Error("Cannot read properties of undefined (reading 'label')");
  },
}));

const seenSetSelectedNode: unknown[] = [];

vi.mock("@/components/views/BrowseView", () => ({
  BrowseView: ({
    setSelectedNode,
    setActiveTab,
  }: {
    setSelectedNode: (n: { id: string } | null) => void;
    setActiveTab: (t: string) => void;
  }) => {
    seenSetSelectedNode.push(setSelectedNode);
    return (
      <>
        <p>Browse-visningen virker</p>
        <button
          onClick={() => {
            // Two URL setters in one handler, exactly as the real "Vis i graf" buttons do.
            setSelectedNode({ id: "doc0_sec_9" });
            setActiveTab("graph");
          }}
        >
          Vis i graf
        </button>
      </>
    );
  },
}));

vi.mock("@/components/views/ConsolidationView", () => ({
  ConsolidationView: () => <p>Konsolideringsvisningen virker</p>,
}));

// The real upload screen posts a PDF to the parse route; this stands in for a finished parse.
vi.mock("@/components/UploadScreen", () => ({
  UploadScreen: ({
    onSuccess,
  }: {
    onSuccess: (data: GraphData, presetIds?: string[]) => void;
  }) => (
    <>
      <button onClick={() => onSuccess(emptyData, ["eu-1224-2009", "eu-2023-2842"])}>
        Indlæs testkorpus
      </button>
      <button onClick={() => onSuccess(emptyData)}>Indlæs uploadet korpus</button>
    </>
  ),
}));

import Home from "./page";

describe("Home view error boundaries", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the header and tab bar usable when a view throws", async () => {
    const { rerender } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Indlæs testkorpus/i }));

    // The failing view is contained.
    expect(await screen.findByRole("alert")).toBeInTheDocument();
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
    rerender(<Home />);
    expect(screen.getByText("Browse-visningen virker")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("URL-addressable screens", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the preset corpus in the URL so the analysis has a shareable link", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Indlæs testkorpus/i }));

    expect(replace).toHaveBeenCalledWith("/?docs=eu-1224-2009%2Ceu-2023-2842", { scroll: false });
  });

  it("leaves the URL empty for a hand-uploaded corpus, which nothing can address", () => {
    // There is nowhere to persist an uploaded PDF, so a link naming it would resolve to a
    // different corpus for whoever opened it. No link is the honest outcome.
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Indlæs uploadet korpus/i }));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("writes the selected tab into the URL and keeps the corpus with it", () => {
    const { rerender } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Indlæs testkorpus/i }));
    rerender(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /^Konsolidering$/ }));

    const [href] = replace.mock.calls[replace.mock.calls.length - 1];
    expect(href).toContain("view=consolidation");
    expect(href).toContain("docs=eu-1224-2009%2Ceu-2023-2842");
  });

  it("opens straight into the view named by the URL, restoring the corpus first", async () => {
    // This is the whole point of the schema: a link built by an agent, or pasted by a
    // colleague, lands on the screen it names rather than on the upload form.
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=consolidation";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => emptyData });

    render(<Home />);

    expect(await screen.findByText("Konsolideringsvisningen virker")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/parse",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls back to the upload screen when the corpus in the URL cannot be restored", async () => {
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=consolidation";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText(/Korpusset i linket kunne ikke indlæses/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /Indlæs testkorpus/i })).toBeInTheDocument();
  });

  it("ignores a provision id that does not resolve instead of failing to render", async () => {
    // A link built against a different document order, or a stale one, selects nothing.
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=browse&p=doc0_sec_9999";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => emptyData });

    render(<Home />);

    expect(await screen.findByText("Browse-visningen virker")).toBeInTheDocument();
  });
});

describe("URL setter composition and identity", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
    seenSetSelectedNode.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps both patches when one handler fires two URL setters", async () => {
    // Each setter rebases on the last render's state, so without composing them the second
    // call drops the first's patch and the selection is lost on the way to the graph.
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=browse";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => emptyData });

    const { rerender } = render(<Home />);
    expect(await screen.findByText("Browse-visningen virker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Vis i graf/i }));

    const [href] = replace.mock.calls[replace.mock.calls.length - 1];
    expect(href).toContain("view=graph");
    expect(href).toContain("p=doc0_sec_9");
    rerender(<Home />);
  });

  it("hands the graph views a setter whose identity survives a navigation", async () => {
    // The two d3 canvases list setSelectedNode in the dependency array of their
    // teardown-and-rebuild effect. A setter rebuilt per navigation re-runs that effect on
    // the very click that selected a node, throwing away the user's pan and zoom.
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=browse";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => emptyData });

    const { rerender } = render(<Home />);
    expect(await screen.findByText("Browse-visningen virker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Vis i graf/i }));
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=browse&p=doc0_sec_9";
    rerender(<Home />);

    expect(seenSetSelectedNode.length).toBeGreaterThan(1);
    const first = seenSetSelectedNode[0];
    for (const seen of seenSetSelectedNode) {
      expect(Object.is(seen, first)).toBe(true);
    }
  });
});

describe("Restore retry", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("actually re-issues the request when the retry button is clicked", async () => {
    // The restore effect keys on the document set, which a retry does not change, so the
    // button needs a trigger the effect can observe. Without one it hides the banner and
    // silently abandons the corpus the link named.
    currentQuery = "docs=eu-1224-2009,eu-2023-2842&view=consolidation";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, json: async () => emptyData });
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText(/Korpusset i linket kunne ikke indlæses/i)).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Prøv igen/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
