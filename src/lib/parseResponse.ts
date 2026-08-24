import type { GraphData } from "./types";
import type { TranslateFn } from "./i18n";

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

/**
 * Turns a failed /api/parse response into a message a Danish caseworker can act on.
 *
 * The route answers every failure with a JSON `error`, but it is not always the route that
 * answers: a platform in front of it rejects an oversized request body, an auth gate
 * redirects, a gateway times out, and all three reply in HTML or plain text. The old code
 * parsed that body as JSON, swallowed the failure, and left the message at its default, so
 * the user saw "Ukendt fejl. Prøv igen." with nothing to act on. A 413 in particular has a
 * concrete remedy, so it gets its own message.
 *
 * The raw body is returned alongside, unparsed if it was not JSON, so the copyable error
 * report still carries what the server actually said.
 */
export async function readErrorResponse(
  response: Response,
  t: TranslateFn
): Promise<{ message: string; parsedBody: unknown }> {
  const rawBody = await response.text();

  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Not JSON. The status is then the only thing that carries meaning.
    return {
      message:
        response.status === 413
          ? t("uploadTooLargeError")
          : t("httpErrorFallback").replace("{status}", String(response.status)),
      parsedBody: rawBody,
    };
  }

  const error = (parsedBody as { error?: unknown })?.error;
  if (typeof error === "string" && error) {
    return { message: error, parsedBody };
  }
  return {
    message:
      response.status === 413
        ? t("uploadTooLargeError")
        : t("httpErrorFallback").replace("{status}", String(response.status)),
    parsedBody,
  };
}
