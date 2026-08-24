import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { highlightModalKeywords } from "./highlightText";

describe("highlightModalKeywords", () => {
  it("renders plain text without changes when no modal keywords are present", () => {
    const { container } = render(<div>{highlightModalKeywords("Dette er en almindelig sætning uden nøgleord.")}</div>);
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(container.textContent).toBe("Dette er en almindelig sætning uden nøgleord.");
  });

  it("highlights Danish obligation and exception keywords with appropriate classes", () => {
    const text = "Føreren skal registrere fangsten, men fritages hvis fartøjet er under 12 meter.";
    const { container } = render(<div>{highlightModalKeywords(text)}</div>);
    
    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe("skal");
    expect(marks[0].getAttribute("title")).toContain("Obligation");
    expect(marks[1].textContent).toBe("fritages");
    expect(marks[1].getAttribute("title")).toContain("Exception");
  });

  it("highlights English modal keywords correctly", () => {
    const text = "The master must submit the logbook. Notwithstanding Article 14, small vessels are exempt.";
    const { container } = render(<div>{highlightModalKeywords(text)}</div>);
    
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThanOrEqual(2);
  });
});
