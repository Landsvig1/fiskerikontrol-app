/**
 * HTML text extraction and format detection for LexGraph legal documents.
 * Extracts clean, structured plain text from HTML documents (e.g. EUR-Lex and Retsinformation)
 * so that sections, articles, and citations are parsed identically to PDF text.
 */

/** Check if a buffer starts with or contains the standard PDF magic header. */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  // Standard %PDF- header is within the first 1024 bytes
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
  return headerSlice.includes(Buffer.from("%PDF-"));
}

/** Check if a buffer looks like HTML content rather than binary or PDF. */
export function isHtmlBuffer(buffer: Buffer): boolean {
  if (isPdfBuffer(buffer)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf-8");
  return (
    /<!doctype\s+html/i.test(sample) ||
    /<html[\s>]/i.test(sample) ||
    /<body[\s>]/i.test(sample) ||
    /<\?xml/i.test(sample) ||
    /<(div|p|span|article|section|h[1-6])\b[^>]*>/i.test(sample)
  );
}

export interface DetectableInput {
  buffer: Buffer;
  contentType?: string;
  filename?: string;
}

/** Determines if an input should be parsed as HTML. */
export function isHtmlInput(input: DetectableInput): boolean {
  if (input.contentType?.includes("text/html") || input.contentType?.includes("application/xhtml+xml")) {
    return true;
  }
  if (input.filename && /\.(html?|xhtml)$/i.test(input.filename)) {
    return true;
  }
  if (isPdfBuffer(input.buffer)) {
    return false;
  }
  return isHtmlBuffer(input.buffer);
}

const COMMON_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&apos;": "'",
  "&#39;": "'",
  "&sect;": "§",
  "&euro;": "€",
  "&copy;": "©",
  "&reg;": "®",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
  "&bull;": "•",
  "&deg;": "°",
  "&plusmn;": "±",
};

/** Decodes named and numeric HTML entities. */
export function decodeHtmlEntities(text: string): string {
  let result = text;
  for (const [entity, replacement] of Object.entries(COMMON_ENTITIES)) {
    if (result.includes(entity)) {
      result = result.replaceAll(entity, replacement);
    }
  }

  // Decimal entities &#123;
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const num = parseInt(code, 10);
    return !isNaN(num) && num > 0 ? String.fromCharCode(num) : "";
  });

  // Hex entities &#x1F;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const num = parseInt(hex, 16);
    return !isNaN(num) && num > 0 ? String.fromCharCode(num) : "";
  });

  return result;
}

/**
 * Extracts clean, formatted plain text from raw HTML markup.
 * Ensures block elements (p, div, h1-h6, etc.) boundary lines with newlines so that
 * legal heading patterns (Artikel 1, § 1, etc.) start on new lines.
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return "";

  // 1. Remove script, style, noscript, svg tags and their internal content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  // 2. Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Convert <br> tags to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 4. Convert block element openings and closings to newlines
  text = text.replace(
    /<\/?(?:p|div|h[1-6]|article|section|header|footer|aside|nav|main|li|tr|td|th|dt|dd|blockquote|pre|hr|table|tbody|thead|tfoot)\b[^>]*>/gi,
    "\n"
  );

  // 5. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // 6. Decode entities
  text = decodeHtmlEntities(text);

  // 7. Normalize whitespace
  text = text.replace(/\u00a0/g, " ");
  // Collapse tabs and spaces on individual lines
  text = text.replace(/[^\S\n]+/g, " ");

  // Trim each line and collapse excess empty lines
  const lines = text.split("\n").map((line) => line.trim());
  text = lines.join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Attempts to extract a sensible document title from HTML markup,
 * checking <title>, <h1>, or prominent header elements.
 */
export function extractTitleFromHtml(html: string): string | null {
  if (!html) return null;

  const titleMatch = /<title\b[^>]*>([^<]+)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1].trim()) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  const h1Match = /<h1\b[^>]*>([^<]+)<\/h1>/i.exec(html);
  if (h1Match && h1Match[1].trim()) {
    return decodeHtmlEntities(h1Match[1].trim());
  }

  return null;
}
