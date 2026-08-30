import {
  FleetFilterCriteria,
  DEFAULT_FLEET_CRITERIA,
  VesselLengthFilter,
  GearTypeFilter,
  SeaAreaFilter,
} from "./fleetFilter";

/**
 * The application's addressable state.
 *
 * Every screen the app can be in is a value of this type, and every value of this type is
 * reachable from a URL. That is what makes the app navigable by something other than a human
 * clicking tabs: an agent, a colleague pasting a link, or a caseworker returning to a case
 * can name a screen instead of describing the sequence of clicks that reaches it.
 *
 * `docs` is the load-bearing field. The corpus used to exist only as component state built
 * from a POST, so no URL could reproduce it. Preset corpora are addressable because the
 * documents ship with the deployment and can be re-parsed from their ids alone; a
 * hand-uploaded corpus is not, and carries an empty `docs`. That asymmetry is honest and
 * deliberate: there is nowhere to persist an uploaded PDF, and a link that silently resolved
 * to a different corpus would be worse than a link that does not exist.
 */

export const TAB_TYPES = [
  "dashboard",
  "consolidation",
  "timeline",
  "citation",
  "graph",
  "overlaps",
  "conflicts",
  "browse",
] as const;

export type TabType = (typeof TAB_TYPES)[number];

export interface AppUrlState {
  /** Preset document ids, in the order they were parsed. Empty for uploaded corpora. */
  docs: string[];
  view: TabType;
  /** Selected provision, a graph node id. */
  provision: string | null;
  search: string;
  activeDocFilter: string;
  activeCategoryFilter: string;
  fleet: FleetFilterCriteria;
}

export const DEFAULT_URL_STATE: AppUrlState = {
  docs: [],
  view: "dashboard",
  provision: null,
  search: "",
  activeDocFilter: "all",
  activeCategoryFilter: "all",
  fleet: DEFAULT_FLEET_CRITERIA,
};

// Short, stable parameter names. These are a public interface the moment a link is shared,
// so they are declared once here rather than spelled out at each call site.
export const PARAM = {
  docs: "docs",
  view: "view",
  provision: "p",
  search: "q",
  doc: "doc",
  category: "cat",
  vesselLength: "len",
  gearType: "gear",
  seaArea: "sea",
} as const;

const VESSEL_LENGTHS: readonly VesselLengthFilter[] = [
  "all",
  "under_8m",
  "8_12m",
  "12_18m",
  "over_18m",
];
const GEAR_TYPES: readonly GearTypeFilter[] = ["all", "passive_nets", "active_trawl", "seine", "traps"];
const SEA_AREAS: readonly SeaAreaFilter[] = ["all", "north_sea", "kattegat", "baltic", "inshore"];

function oneOf<T extends string>(allowed: readonly T[], raw: string | null, fallback: T): T {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * Reads app state out of a query string.
 *
 * Every field falls back to its default rather than throwing or propagating an unrecognised
 * value. A URL is untrusted input: it can be hand-edited, truncated by a chat client, or
 * carried over from an older build whose tab names differed, and none of those should be
 * able to put the app into a state it cannot render.
 */
export function parseAppUrlState(params: URLSearchParams): AppUrlState {
  const rawDocs = params.get(PARAM.docs);
  const docs = rawDocs
    ? rawDocs.split(",").map(id => id.trim()).filter(Boolean)
    : [];

  return {
    docs,
    view: oneOf(TAB_TYPES, params.get(PARAM.view), DEFAULT_URL_STATE.view),
    provision: params.get(PARAM.provision) || null,
    search: params.get(PARAM.search) ?? "",
    activeDocFilter: params.get(PARAM.doc) || "all",
    activeCategoryFilter: params.get(PARAM.category) || "all",
    fleet: {
      vesselLength: oneOf(VESSEL_LENGTHS, params.get(PARAM.vesselLength), "all"),
      gearType: oneOf(GEAR_TYPES, params.get(PARAM.gearType), "all"),
      seaArea: oneOf(SEA_AREAS, params.get(PARAM.seaArea), "all"),
    },
  };
}

/**
 * Writes app state into a query string, omitting anything left at its default.
 *
 * Omitting defaults keeps a shared link readable and, more importantly, keeps it stable:
 * a URL that spelled out every filter would change whenever a default changed, silently
 * pinning old links to settings their author never chose.
 */
export function toSearchParams(state: AppUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.docs.length > 0) params.set(PARAM.docs, state.docs.join(","));
  if (state.view !== DEFAULT_URL_STATE.view) params.set(PARAM.view, state.view);
  if (state.provision) params.set(PARAM.provision, state.provision);
  if (state.search.trim()) params.set(PARAM.search, state.search);
  if (state.activeDocFilter !== "all") params.set(PARAM.doc, state.activeDocFilter);
  if (state.activeCategoryFilter !== "all") params.set(PARAM.category, state.activeCategoryFilter);
  if (state.fleet.vesselLength !== "all") params.set(PARAM.vesselLength, state.fleet.vesselLength);
  if (state.fleet.gearType !== "all") params.set(PARAM.gearType, state.fleet.gearType);
  if (state.fleet.seaArea !== "all") params.set(PARAM.seaArea, state.fleet.seaArea);

  return params;
}

/** The query string for a state, with the leading "?" when non-empty. */
export function toQueryString(state: AppUrlState): string {
  const q = toSearchParams(state).toString();
  return q ? `?${q}` : "";
}
