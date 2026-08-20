import { describe, it, expect, vi } from "vitest";
import { PRESET_DOCUMENTS, fetchPresetFiles } from "./presetCorpus";

describe("presetCorpus", () => {
  it("exports valid preset documents with required metadata", () => {
    expect(PRESET_DOCUMENTS.length).toBe(10);
    expect(PRESET_DOCUMENTS.some((d) => d.id === "eu-1224-2009" && d.code === "EU 1224/2009")).toBe(true);
    
    for (const doc of PRESET_DOCUMENTS) {
      expect(doc.id).toBeTruthy();
      expect(doc.filename.endsWith(".pdf")).toBe(true);
      expect(doc.code).toBeTruthy();
      expect(doc.titleDa).toBeTruthy();
      expect(doc.titleEn).toBeTruthy();
      expect(doc.path.startsWith("/corpus/")).toBe(true);
    }
  });

  it("fetches selected preset files and returns File objects with labels", async () => {
    const mockBlob = new Blob(["fake pdf content"], { type: "application/pdf" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
    });

    const result = await fetchPresetFiles(["eu-2023-2842", "bek-1197-2025"], mockFetch as unknown as typeof fetch);

    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("EU 2023/2842");
    expect(result[0].file.name).toBe("eu-2023-2842-kontrolrevision.pdf");
    expect(result[1].label).toBe("BEK 1197/2025");
    expect(result[1].file.name).toBe("bek-1197-2025-logbog.pdf");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws descriptive error when fetch fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchPresetFiles(["eu-2023-2842"], mockFetch as unknown as typeof fetch)).rejects.toThrow(
      /Failed to load preset document/
    );
  });
});
