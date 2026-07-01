/**
 * Smoke test — verifies the Vitest + fast-check setup is working correctly.
 * This file can be removed once real tests exist.
 */
import fc from "fast-check";

describe("Test framework smoke test", () => {
  it("vitest is configured and running", () => {
    expect(1 + 1).toBe(2);
  });

  it("fast-check is installed and functional", () => {
    // Property: addition is commutative for any two integers
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });
});
