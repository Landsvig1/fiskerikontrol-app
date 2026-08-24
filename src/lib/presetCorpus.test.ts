import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { PRESET_DOCUMENTS } from "./presetCorpus";

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
      expect(["eu", "bek", "lov"]).toContain(doc.type);
    }
  });

  it("has every corpus file present on disk under public/corpus", () => {
    // The parse route reads these from the filesystem rather than accepting them as an
    // upload, so a preset whose PDF is missing or renamed is a 500 at demo time.
    for (const doc of PRESET_DOCUMENTS) {
      const onDisk = path.join(process.cwd(), "public", "corpus", doc.filename);
      expect(fs.existsSync(onDisk), `${doc.filename} is missing`).toBe(true);
      expect(doc.path).toBe(`/corpus/${doc.filename}`);
    }
  });

  it("has unique ids", () => {
    expect(new Set(PRESET_DOCUMENTS.map((d) => d.id)).size).toBe(PRESET_DOCUMENTS.length);
  });
});
