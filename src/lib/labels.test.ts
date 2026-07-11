import { describe, it, expect } from "vitest";
import { deriveLabelFromFilename } from "./labels";

describe("deriveLabelFromFilename", () => {
  it("derives a title-cased label from a snake_case filename", () => {
    expect(deriveLabelFromFilename("Regulation_2024_1143.pdf")).toBe("Regulation 2024 1143");
  });

  it("derives a title-cased label from a kebab-case filename", () => {
    expect(deriveLabelFromFilename("implementation-decision-2019.pdf")).toBe(
      "Implementation Decision 2019"
    );
  });

  it("strips a mixed-case .PDF extension", () => {
    expect(deriveLabelFromFilename("Doc.PDF")).toBe("Doc");
  });

  it("collapses repeated whitespace and mixed separators", () => {
    expect(deriveLabelFromFilename("multiple   spaces  and_underscores.pdf")).toBe(
      "Multiple Spaces And Underscores"
    );
  });

  it("returns an empty string for an empty basename", () => {
    expect(deriveLabelFromFilename(".pdf")).toBe("");
  });

  it("still derives a label when there is no .pdf extension present", () => {
    expect(deriveLabelFromFilename("no-extension")).toBe("No Extension");
  });
});
