import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";
import { getT } from "@/lib/i18n";

const t = getT();

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error("body.slice is not a function");
  return <p>Visningen virker</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error and the boundary logs it again; both are expected here.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary t={t}>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Visningen virker")).toBeInTheDocument();
  });

  it("renders the Danish fallback and the technical message when a child throws", () => {
    render(
      <ErrorBoundary t={t}>
        <Boom shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Denne visning kunne ikke indlæses")).toBeInTheDocument();
    expect(screen.getByText("body.slice is not a function")).toBeInTheDocument();
  });

  it("clears the selection and re-renders the children on reset", () => {
    const onReset = vi.fn();

    function Harness() {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <ErrorBoundary
          t={t}
          onReset={() => {
            setShouldThrow(false);
            onReset();
          }}
        >
          <Boom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Prøv visningen igen/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Visningen virker")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
