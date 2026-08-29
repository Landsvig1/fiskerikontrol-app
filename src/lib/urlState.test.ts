import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  parseAppUrlState,
  toSearchParams,
  toQueryString,
  DEFAULT_URL_STATE,
  TAB_TYPES,
  type AppUrlState,
} from "./urlState";

describe("parseAppUrlState", () => {
  it("returns the default state for an empty query string", () => {
    expect(parseAppUrlState(new URLSearchParams())).toEqual(DEFAULT_URL_STATE);
  });

  it("reads a full consolidation link", () => {
    const state = parseAppUrlState(
      new URLSearchParams(
        "docs=eu-1224-2009,eu-2023-2842&view=consolidation&p=doc0_sec_14&q=logbog&doc=doc1&cat=Fangst&len=under_8m&gear=passive_nets&sea=baltic"
      )
    );

    expect(state).toEqual({
      docs: ["eu-1224-2009", "eu-2023-2842"],
      view: "consolidation",
      provision: "doc0_sec_14",
      search: "logbog",
      activeDocFilter: "doc1",
      activeCategoryFilter: "Fangst",
      fleet: { vesselLength: "under_8m", gearType: "passive_nets", seaArea: "baltic" },
    });
  });

  it("falls back to defaults for values it does not recognise", () => {
    // A URL is untrusted input: hand-edited, truncated by a chat client, or carried over
    // from a build whose tab names differed. None of that may leave the app unrenderable.
    const state = parseAppUrlState(
      new URLSearchParams("view=nonexistent&len=1000m&gear=dynamite&sea=mars")
    );

    expect(state.view).toBe("dashboard");
    expect(state.fleet).toEqual({ vesselLength: "all", gearType: "all", seaArea: "all" });
  });

  it("ignores empty and whitespace-only document ids", () => {
    expect(parseAppUrlState(new URLSearchParams("docs=,,eu-1224-2009, ,")).docs).toEqual([
      "eu-1224-2009",
    ]);
    expect(parseAppUrlState(new URLSearchParams("docs=")).docs).toEqual([]);
  });

  it("treats an empty provision as no selection rather than a node with an empty id", () => {
    expect(parseAppUrlState(new URLSearchParams("p=")).provision).toBeNull();
  });
});

describe("toSearchParams", () => {
  it("omits every field left at its default", () => {
    expect(toQueryString(DEFAULT_URL_STATE)).toBe("");
  });

  it("keeps document order, which the node ids depend on", () => {
    // Node ids are assigned by parse order ("doc0", "doc1", ...), so a provision link is
    // only meaningful against the same document order that produced it.
    const params = toSearchParams({
      ...DEFAULT_URL_STATE,
      docs: ["eu-2023-2842", "eu-1224-2009"],
    });
    expect(params.get("docs")).toBe("eu-2023-2842,eu-1224-2009");
  });

  it("omits a whitespace-only search so it does not count as a filter", () => {
    expect(toSearchParams({ ...DEFAULT_URL_STATE, search: "   " }).get("q")).toBeNull();
  });
});

describe("URL state round trip", () => {
  it("survives parse(serialise(state)) for every state the app can hold", () => {
    const arb: fc.Arbitrary<AppUrlState> = fc.record({
      docs: fc.array(fc.stringMatching(/^[a-z0-9-]+$/), { maxLength: 12 }),
      view: fc.constantFrom(...TAB_TYPES),
      provision: fc.option(fc.stringMatching(/^[a-z0-9_]+$/), { nil: null }),
      // Trimmed, because a search of only whitespace is deliberately not a filter and is
      // dropped on serialisation.
      search: fc.string().map(s => s.trim()),
      activeDocFilter: fc.constantFrom("all", "doc0", "doc1", "doc2"),
      activeCategoryFilter: fc.constantFrom("all", "Fangst & Logbog", "VMS, Sporing & AIS"),
      fleet: fc.record({
        vesselLength: fc.constantFrom("all", "under_8m", "8_12m", "12_18m", "over_18m"),
        gearType: fc.constantFrom("all", "passive_nets", "active_trawl", "seine", "traps"),
        seaArea: fc.constantFrom("all", "north_sea", "kattegat", "baltic", "inshore"),
      }),
    }) as fc.Arbitrary<AppUrlState>;

    fc.assert(
      fc.property(arb, state => {
        // An empty provision id is indistinguishable from no provision in a query string,
        // and the parser normalises it to null; normalise the input the same way.
        const normalised: AppUrlState = { ...state, provision: state.provision || null };
        expect(parseAppUrlState(toSearchParams(normalised))).toEqual(normalised);
      }),
      { numRuns: 300 }
    );
  });
});
