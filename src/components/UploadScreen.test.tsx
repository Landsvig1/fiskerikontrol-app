import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadScreen } from "./UploadScreen";
import { getT } from "@/lib/i18n";
import type { GraphData } from "@/app/page";

const t = getT("en");

function pdf(name: string): File {
  return new File(["%PDF-1.4 content"], name, { type: "application/pdf" });
}

function nonPdf(name: string): File {
  return new File(["not a pdf"], name, { type: "application/msword" });
}

function makeGraphData(): GraphData {
  return { nodes: [], links: [], overlaps: [], conflicts: [], docs: [{ id: "doc0", label: "A" }, { id: "doc1", label: "B" }] };
}

function slotName(index: number): string {
  return `${t("docFallback")} ${index + 1}`;
}

function renderUploadScreen(onSuccess = vi.fn()) {
  render(<UploadScreen onSuccess={onSuccess} t={t} lang="en" setLang={() => {}} />);
  return { onSuccess };
}

describe("UploadScreen bulk mode (default)", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assigns two dropped PDFs to the first two slots in order, auto-filling labels, and auto-triggers analysis", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => makeGraphData(),
    });
    const { onSuccess } = renderUploadScreen();

    const dropZone = screen.getByTestId("upload-drop-zone");
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdf("Regulation_2024.pdf"), pdf("Implementation-Decision.pdf")] },
    });

    expect(await screen.findByText("Regulation_2024.pdf")).toBeInTheDocument();
    expect(screen.getByText("Implementation-Decision.pdf")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Regulation 2024")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Implementation Decision")).toBeInTheDocument();
    expect(screen.queryByText(t("multiDropNonPdfIgnored"))).not.toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = options.body as FormData;
    expect(body.get("pdf0")).toBeTruthy();
    expect(body.get("pdf1")).toBeTruthy();
    expect(body.get("label0")).toBe("Regulation 2024");
    expect(body.get("label1")).toBe("Implementation Decision");

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ docs: expect.any(Array) }));
  });

  it("assigns all dropped PDFs when 3+ are dropped together, appending beyond the initial two slots, and auto-fires", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => makeGraphData(),
    });
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdf("one.pdf"), pdf("two.pdf"), pdf("three.pdf")] },
    });

    expect(await screen.findByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.getByText("three.pdf")).toBeInTheDocument();
    expect(screen.queryByText(t("multiDropNonPdfIgnored"))).not.toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = options.body as FormData;
    expect(body.get("pdf2")).toBeTruthy();
    expect(body.get("label2")).toBe("Three");
  });

  it("appends onto an already-partially-filled slot array without touching existing slots", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));

    fireEvent.drop(screen.getByRole("button", { name: slotName(0) }), { dataTransfer: { files: [pdf("first.pdf")] } });
    fireEvent.drop(screen.getByRole("button", { name: slotName(1) }), { dataTransfer: { files: [pdf("second.pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: t("addDocument") }));
    await screen.findByText("second.pdf");

    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeBulk") }));
    const dropZone = screen.getByTestId("upload-drop-zone");
    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("third.pdf"), pdf("fourth.pdf")] } });

    // The two pre-existing filled slots are untouched; "third" fills the empty 3rd slot,
    // "fourth" appends as a brand-new 4th slot.
    expect(screen.getByText("first.pdf")).toBeInTheDocument();
    expect(screen.getByText("second.pdf")).toBeInTheDocument();
    expect(await screen.findByText("third.pdf")).toBeInTheDocument();
    expect(screen.getByText("fourth.pdf")).toBeInTheDocument();
  });

  it("truncates to the 12-slot soft cap and shows a notice when a bulk drop would exceed it", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    const files = Array.from({ length: 13 }, (_, i) => pdf(`doc${i}.pdf`));
    fireEvent.drop(dropZone, { dataTransfer: { files } });

    expect(await screen.findByText("doc11.pdf")).toBeInTheDocument();
    expect(screen.queryByText("doc12.pdf")).not.toBeInTheDocument();
    expect(screen.getByText(t("multiDropCapReached").replace("{max}", "12"))).toBeInTheDocument();
  });

  it("ignores a non-PDF file dropped alongside a PDF and shows a notice", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdf("valid.pdf"), nonPdf("notes.docx")] },
    });

    expect(await screen.findByText("valid.pdf")).toBeInTheDocument();
    expect(screen.getByText(t("multiDropNonPdfIgnored"))).toBeInTheDocument();
  });

  it("auto-fires analysis when files are dropped onto the single box sequentially", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => makeGraphData(),
    });
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("first.pdf")] } });
    expect(await screen.findByText("first.pdf")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("second.pdf")] } });
    expect(await screen.findByText("second.pdf")).toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it("shows the existing submit error UI when auto-triggered analysis fails, and allows manual retry", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => JSON.stringify({ error: "boom" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => makeGraphData() });

    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("a.pdf"), pdf("b.pdf")] } });

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const submitButton = screen.getByRole("button", { name: t("analyseButton") });
    fireEvent.click(submitButton);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it("ignores a file drop onto the box while a request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("original-a.pdf"), pdf("original-b.pdf")] } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("original-a.pdf")).toBeInTheDocument();

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("replacement.pdf")] } });

    expect(screen.getByText("original-a.pdf")).toBeInTheDocument();
    expect(screen.queryByText("replacement.pdf")).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => makeGraphData() });
  });

  it("shows the invalid-file notice, not the ignored-files notice, when a multi-drop has zero valid PDFs", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [nonPdf("a.docx"), nonPdf("b.docx")] } });

    expect(await screen.findByText(t("invalidPdfError"))).toBeInTheDocument();
    expect(screen.queryByText(t("multiDropNonPdfIgnored"))).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("clears a stale multi-drop notice once the user fixes it via a corrective drop on the same box", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("one.pdf"), nonPdf("bad.docx")] } });
    expect(await screen.findByText(t("multiDropNonPdfIgnored"))).toBeInTheDocument();

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("corrected.pdf")] } });

    expect(await screen.findByText("corrected.pdf")).toBeInTheDocument();
    expect(screen.queryByText(t("multiDropNonPdfIgnored"))).not.toBeInTheDocument();
  });

  it("resets the container drag highlight after a drop", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
    expect(dropZone.className).toMatch(/border-\[#38bdf8\]/);

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("one.pdf")] } });

    expect(await screen.findByText("one.pdf")).toBeInTheDocument();
    expect(dropZone.className).not.toMatch(/border-\[#38bdf8\]/);
  });

  it("does not auto-fire when an unrelated label edit happens to satisfy canSubmit after a prior file drop", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    // ".pdf" derives to an empty label, leaving canSubmit false even though both slots are filled.
    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf(".pdf"), pdf("valid-b.pdf")] } });
    await screen.findByText(".pdf");
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(slotName(0)), { target: { value: "X" } });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("UploadScreen mode toggle and individual mode", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves slot state when toggling between bulk and individual mode", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("one.pdf"), pdf("two.pdf"), pdf("three.pdf")] } });
    await screen.findByText("three.pdf");

    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    expect(screen.getByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.getByText("three.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeBulk") }));
    expect(screen.getByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.getByText("three.pdf")).toBeInTheDocument();
  });

  it("does not overwrite a manually-edited label when the same file is re-dropped onto its slot", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    const slot0 = screen.getByRole("button", { name: slotName(0) });

    const file = pdf("original-name.pdf");
    fireEvent.drop(slot0, { dataTransfer: { files: [file] } });
    expect(await screen.findByDisplayValue("Original Name")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(slotName(0)), { target: { value: "Custom Label" } });
    expect(screen.getByDisplayValue("Custom Label")).toBeInTheDocument();

    fireEvent.drop(slot0, { dataTransfer: { files: [file] } });
    expect(screen.getByDisplayValue("Custom Label")).toBeInTheDocument();
  });

  it("re-derives the label when a different file replaces the slot after a manual edit", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    const slot0 = screen.getByRole("button", { name: slotName(0) });

    fireEvent.drop(slot0, { dataTransfer: { files: [pdf("first-doc.pdf")] } });
    await screen.findByDisplayValue("First Doc");

    fireEvent.change(screen.getByPlaceholderText(slotName(0)), { target: { value: "Custom Label" } });

    fireEvent.drop(slot0, { dataTransfer: { files: [pdf("second-doc.pdf")] } });
    expect(await screen.findByDisplayValue("Second Doc")).toBeInTheDocument();
  });

  it("shows the ignored-files notice when multiple files are dropped directly on a single slot", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    const slot0 = screen.getByRole("button", { name: slotName(0) });

    fireEvent.drop(slot0, { dataTransfer: { files: [pdf("first.pdf"), pdf("second.pdf")] } });

    expect(await screen.findByText("first.pdf")).toBeInTheDocument();
    expect(screen.getByText(t("multiDropNonPdfIgnored"))).toBeInTheDocument();
  });

  it("does not render a remove control at exactly 2 slots, but does once a 3rd slot is added", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));

    expect(screen.queryByRole("button", { name: `${t("removeDocument")} 1` })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("addDocument") }));
    expect(screen.getByRole("button", { name: `${t("removeDocument")} 3` })).toBeInTheDocument();
  });

  it("removes the correct slot and shifts subsequent slots down", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));

    const slot0 = screen.getByRole("button", { name: slotName(0) });
    const slot1 = screen.getByRole("button", { name: slotName(1) });
    fireEvent.drop(slot0, { dataTransfer: { files: [pdf("first.pdf")] } });
    fireEvent.drop(slot1, { dataTransfer: { files: [pdf("second.pdf")] } });
    await screen.findByText("second.pdf");

    fireEvent.click(screen.getByRole("button", { name: t("addDocument") }));
    const slot2 = screen.getByRole("button", { name: slotName(2) });
    fireEvent.drop(slot2, { dataTransfer: { files: [pdf("third.pdf")] } });
    await screen.findByText("third.pdf");

    const fetchCallsBeforeRemove = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: `${t("removeDocument")} 1` }));

    expect(screen.queryByText("first.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("second.pdf")).toBeInTheDocument();
    expect(screen.getByText("third.pdf")).toBeInTheDocument();
    // The remaining 2 slots (second, third) are now fully filled+labeled and would satisfy
    // canSubmit — proves the removal itself disarmed auto-fire rather than triggering a new call.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsBeforeRemove);
  });

  it("disables 'Add document' once the 12-slot cap is reached", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));

    const addButton = screen.getByRole("button", { name: t("addDocument") });
    for (let i = 0; i < 10; i++) {
      fireEvent.click(addButton);
    }

    expect(addButton).toBeDisabled();
  });

  it("focuses the newly-added slot's label input after clicking 'Add document'", async () => {
    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));

    fireEvent.click(screen.getByRole("button", { name: t("addDocument") }));

    expect(screen.getByPlaceholderText(slotName(2))).toHaveFocus();
  });

  it("does not auto-fire merely from switching modes, even when the array already satisfies canSubmit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => makeGraphData(),
    });
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    // The drop itself already satisfies canSubmit and auto-fires once — that's expected,
    // existing behavior. This test isolates whether a *subsequent* mode toggle fires again.
    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf("a.pdf"), pdf("b.pdf")] } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeBulk") }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("disables add/remove/mode-toggle controls while a request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderUploadScreen();
    fireEvent.click(screen.getByRole("tab", { name: t("uploadModeIndividual") }));
    fireEvent.click(screen.getByRole("button", { name: t("addDocument") }));

    fireEvent.drop(screen.getByRole("button", { name: slotName(0) }), { dataTransfer: { files: [pdf("a.pdf")] } });
    fireEvent.drop(screen.getByRole("button", { name: slotName(1) }), { dataTransfer: { files: [pdf("b.pdf")] } });
    fireEvent.drop(screen.getByRole("button", { name: slotName(2) }), { dataTransfer: { files: [pdf("c.pdf")] } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("button", { name: t("addDocument") })).toBeDisabled();
    expect(screen.getByRole("button", { name: `${t("removeDocument")} 1` })).toBeDisabled();
    expect(screen.getByRole("tab", { name: t("uploadModeBulk") })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => makeGraphData() });
  });

  it("renders preset document catalog cards and allows toggling selection", () => {
    renderUploadScreen();
    
    expect(screen.getByText(t("presetLibraryTitle"))).toBeInTheDocument();
    expect(screen.getByText("EU 2023/2842")).toBeInTheDocument();
    expect(screen.getByText("BEK 1197/2025")).toBeInTheDocument();
    expect(screen.getByText("BEK 1144/2025")).toBeInTheDocument();
    expect(screen.getByText("LBK 205/2023")).toBeInTheDocument();

    const euCard = screen.getByTestId("preset-card-eu-2023-2842");
    fireEvent.click(euCard); // Deselect
    const bek1144Card = screen.getByTestId("preset-card-bek-1144-2025");
    fireEvent.click(bek1144Card); // Select
  });

  it("fetches preset files and calls parse API when preset launch button is clicked", async () => {
    const mockBlob = new Blob(["mock pdf"], { type: "application/pdf" });
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.startsWith("/corpus/")) {
        return {
          ok: true,
          status: 200,
          blob: async () => mockBlob,
        };
      }
      if (url === "/api/parse") {
        return {
          ok: true,
          status: 200,
          json: async () => makeGraphData(),
        };
      }
      return { ok: false, status: 404 };
    });

    renderUploadScreen();

    const launchButton = screen.getByRole("button", { name: new RegExp(t("analyzePresets"), "i") });
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/parse", expect.objectContaining({ method: "POST" }));
    });
  });
});

