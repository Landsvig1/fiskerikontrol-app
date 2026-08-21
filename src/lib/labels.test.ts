import { describe, it, expect } from "vitest";
import { deriveLabelFromFilename, themeLabel, formatConflictDescription } from "./labels";

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

describe("themeLabel", () => {
  it("translates theme names to Danish when lang is da", () => {
    expect(themeLabel("Obligations and Duties", "da")).toBe("Forpligtelser & Pligter");
    expect(themeLabel("Exceptions and Exemptions", "da")).toBe("Undtagelser & Dispensationer");
    expect(themeLabel("Definitions and Scope", "da")).toBe("Definitioner & Anvendelsesområde");
    expect(themeLabel("General", "da")).toBe("Generelt");
  });

  it("preserves English theme names when lang is en", () => {
    expect(themeLabel("Obligations and Duties", "en")).toBe("Obligations and Duties");
  });
});

describe("formatConflictDescription", () => {
  it("formats generic conflict descriptions to Danish when lang is da", () => {
    const raw = "Potential conflict: one section creates an exception/exemption while another imposes an obligation or prohibition regarding Art. 33.";
    const result = formatConflictDescription(raw, "Art. 33", "da");
    expect(result).toContain("Potentiel regulatorisk modstrid");
    expect(result).toContain("undtagelse/lempelse");
    expect(result).toContain("Art. 33");
  });

  it("preserves English conflict description when lang is en", () => {
    const raw = "Potential conflict: one section creates an exception regarding Art. 33.";
    const result = formatConflictDescription(raw, "Art. 33", "en");
    expect(result).toBe(raw);
  });
});

