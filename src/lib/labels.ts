/** Derives a human-readable document label from an uploaded PDF filename. */
export function deriveLabelFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.pdf$/i, "");
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
