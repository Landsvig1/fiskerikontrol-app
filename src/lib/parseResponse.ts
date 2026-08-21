import type { GraphData } from "./types";

/**
 * Runtime shape check for the /api/parse response.
 *
 * The response is JSON, so its static GraphData type is an assertion the client makes about
 * bytes it did not produce. Every view then indexes into nodes, links, overlaps, conflicts
 * and docs without guarding, so a truncated or unexpected body surfaces as a crash inside a
 * render rather than as an error the upload screen can report.
 *
 * Deliberately narrow: it checks that the five collections exist and that each element
 * carries the fields the views actually read. It does not validate the modality union,
 * modalityColor already falls back for an unrecognised value, nor referential integrity
 * between links and nodes, which the views handle by lookup miss.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStrings(value: unknown, keys: string[]): boolean {
  return isRecord(value) && keys.every((key) => typeof value[key] === "string");
}

function everyItem(value: unknown, predicate: (item: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(predicate);
}

export function isGraphData(value: unknown): value is GraphData {
  if (!isRecord(value)) return false;

  const nodesOk = everyItem(
    value.nodes,
    (n) => hasStrings(n, ["id", "label", "doc", "body"]) && typeof (n as Record<string, unknown>).number === "number"
  );
  const linksOk = everyItem(
    value.links,
    (l) => hasStrings(l, ["type", "modality"]) && isRecord(l) && typeof l.source === "string" && typeof l.target === "string"
  );
  const overlapsOk = everyItem(
    value.overlaps,
    (o) => isRecord(o) && typeof o.target === "string" && Array.isArray(o.citations)
  );
  const conflictsOk = everyItem(
    value.conflicts,
    (c) => isRecord(c) && typeof c.target === "string" && Array.isArray(c.modalities) && Array.isArray(c.citations)
  );
  const docsOk = everyItem(value.docs, (d) => hasStrings(d, ["id", "label"]));

  return nodesOk && linksOk && overlapsOk && conflictsOk && docsOk;
}
