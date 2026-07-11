import "@testing-library/jest-dom/vitest";
import { useState } from "react";
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
  return { nodes: [], links: [], overlaps: [], conflicts: [], labelA: "A", labelB: "B" };
}

function renderUploadScreen(onSuccess = vi.fn()) {
  function Wrapper() {
    const [labelAInput, setLabelAInput] = useState("");
    const [labelBInput, setLabelBInput] = useState("");
    return (
      <UploadScreen
        onSuccess={onSuccess}
        t={t}
        lang="en"
        setLang={() => {}}
        labelAInput={labelAInput}
        setLabelAInput={setLabelAInput}
        labelBInput={labelBInput}
        setLabelBInput={setLabelBInput}
      />
    );
  }
  render(<Wrapper />);
  return { onSuccess };
}

describe("UploadScreen multi-file drop", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assigns two dropped PDFs to slot A and B in order, auto-filling labels, and auto-triggers analysis", async () => {
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
    expect(screen.queryByText(/only the first two/i)).not.toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = options.body as FormData;
    expect(body.get("pdfA")).toBeTruthy();
    expect(body.get("pdfB")).toBeTruthy();
    expect(body.get("labelA")).toBe("Regulation 2024");
    expect(body.get("labelB")).toBe("Implementation Decision");

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("assigns only the first two PDFs when 3 files are dropped together, and shows a notice", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdf("one.pdf"), pdf("two.pdf"), pdf("three.pdf")] },
    });

    expect(await screen.findByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.queryByText("three.pdf")).not.toBeInTheDocument();
    expect(screen.getByText(/only the first two/i)).toBeInTheDocument();
  });

  it("ignores a non-PDF file dropped alongside a PDF and shows a notice", async () => {
    renderUploadScreen();
    const dropZone = screen.getByTestId("upload-drop-zone");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdf("valid.pdf"), nonPdf("notes.docx")] },
    });

    expect(await screen.findByText("valid.pdf")).toBeInTheDocument();
    expect(screen.getByText(/only the first two/i)).toBeInTheDocument();
  });

  it("auto-fires analysis when files are dropped into slots sequentially", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => makeGraphData(),
    });
    renderUploadScreen();

    const slotA = screen.getByRole("button", { name: t("labelA") });
    const slotB = screen.getByRole("button", { name: t("labelB") });

    fireEvent.drop(slotA, { dataTransfer: { files: [pdf("first.pdf")] } });
    expect(await screen.findByText("first.pdf")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.drop(slotB, { dataTransfer: { files: [pdf("second.pdf")] } });
    expect(await screen.findByText("second.pdf")).toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it("does not overwrite a manually-edited label when the same file is re-dropped", async () => {
    renderUploadScreen();
    const slotA = screen.getByRole("button", { name: t("labelA") });

    const file = pdf("original-name.pdf");
    fireEvent.drop(slotA, { dataTransfer: { files: [file] } });
    expect(await screen.findByDisplayValue("Original Name")).toBeInTheDocument();

    fireEvent.change(document.getElementById("labelA") as HTMLInputElement, { target: { value: "Custom Label" } });
    expect(screen.getByDisplayValue("Custom Label")).toBeInTheDocument();

    fireEvent.drop(slotA, { dataTransfer: { files: [file] } });
    expect(screen.getByDisplayValue("Custom Label")).toBeInTheDocument();
  });

  it("re-derives the label when a different file replaces the slot after a manual edit", async () => {
    renderUploadScreen();
    const slotA = screen.getByRole("button", { name: t("labelA") });

    fireEvent.drop(slotA, { dataTransfer: { files: [pdf("first-doc.pdf")] } });
    await screen.findByDisplayValue("First Doc");

    fireEvent.change(document.getElementById("labelA") as HTMLInputElement, { target: { value: "Custom Label" } });

    fireEvent.drop(slotA, { dataTransfer: { files: [pdf("second-doc.pdf")] } });
    expect(await screen.findByDisplayValue("Second Doc")).toBeInTheDocument();
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
});
