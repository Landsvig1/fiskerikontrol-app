import { describe, it, expect } from "vitest";
import { docLabel, docColorFor, docBadgeStyle } from "./docDisplay";
import { DOC_COLOR_PALETTE } from "./graphColors";
import { getT } from "./i18n";

const t = getT();
const docs = [
  { id: "doc0", label: "Base Act" },
  { id: "doc1", label: "" },
];

describe("docLabel", () => {
  it("returns the document's own label when set", () => {
    expect(docLabel(docs, "doc0", t)).toBe("Base Act");
  });

  it("falls back to '{docFallback} {index+1}' when the label is blank", () => {
    expect(docLabel(docs, "doc1", t)).toBe("Dokument 2");
  });

  it("returns the raw docId when it isn't present in docs[]", () => {
    expect(docLabel(docs, "doc99", t)).toBe("doc99");
  });
});

describe("docColorFor", () => {
  it("returns the palette color at the document's index", () => {
    expect(docColorFor(docs, "doc1")).toBe(DOC_COLOR_PALETTE[1]);
  });

  it("falls back to the first palette color for an unknown docId", () => {
    expect(docColorFor(docs, "doc99")).toBe(DOC_COLOR_PALETTE[0]);
  });

  it("cycles through the full palette for document counts beyond its length", () => {
    const manyDocs = Array.from({ length: DOC_COLOR_PALETTE.length + 2 }, (_, i) => ({ id: `doc${i}`, label: `D${i}` }));
    const lastId = `doc${DOC_COLOR_PALETTE.length + 1}`;
    expect(docColorFor(manyDocs, lastId)).toBe(DOC_COLOR_PALETTE[(DOC_COLOR_PALETTE.length + 1) % DOC_COLOR_PALETTE.length]);
  });
});

describe("docBadgeStyle", () => {
  it("applies the default background alpha and omits borderColor when not requested", () => {
    const style = docBadgeStyle(docs, "doc0");
    expect(style.backgroundColor).toBe(`${DOC_COLOR_PALETTE[0]}1a`);
    expect(style.color).toBe(DOC_COLOR_PALETTE[0]);
    expect(style.borderColor).toBeUndefined();
  });

  it("applies custom bgAlpha and borderAlpha when provided", () => {
    const style = docBadgeStyle(docs, "doc1", { bgAlpha: "26", borderAlpha: "4d" });
    expect(style.backgroundColor).toBe(`${DOC_COLOR_PALETTE[1]}26`);
    expect(style.borderColor).toBe(`${DOC_COLOR_PALETTE[1]}4d`);
  });
});
