import { describe, it, expect } from "vitest";
import {
  isPdfBuffer,
  isHtmlBuffer,
  isHtmlInput,
  extractTextFromHtml,
  extractTitleFromHtml,
  decodeHtmlEntities,
} from "./htmlExtract";
import { parsePdfTextIntoSections } from "./parser";

describe("htmlExtract", () => {
  describe("isPdfBuffer", () => {
    it("identifies standard PDF magic numbers", () => {
      const pdf = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
      expect(isPdfBuffer(pdf)).toBe(true);
    });

    it("returns false for non-PDF buffers", () => {
      const html = Buffer.from("<!DOCTYPE html><html><body>Test</body></html>");
      expect(isPdfBuffer(html)).toBe(false);
      expect(isPdfBuffer(Buffer.from("Hello world"))).toBe(false);
      expect(isPdfBuffer(Buffer.alloc(0))).toBe(false);
    });
  });

  describe("isHtmlBuffer", () => {
    it("detects HTML documents by doctype or tags", () => {
      expect(isHtmlBuffer(Buffer.from("<!DOCTYPE html><html><body></body></html>"))).toBe(true);
      expect(isHtmlBuffer(Buffer.from("<div><p>Artikel 1</p></div>"))).toBe(true);
      expect(isHtmlBuffer(Buffer.from("<?xml version=\"1.0\"?><html><body></body></html>"))).toBe(true);
    });

    it("rejects PDF buffers even if they have text", () => {
      expect(isHtmlBuffer(Buffer.from("%PDF-1.7\n<p>fake</p>"))).toBe(false);
    });
  });

  describe("isHtmlInput", () => {
    it("detects HTML based on mime type", () => {
      expect(
        isHtmlInput({
          buffer: Buffer.from("test"),
          contentType: "text/html",
        })
      ).toBe(true);
    });

    it("detects HTML based on filename extension", () => {
      expect(
        isHtmlInput({
          buffer: Buffer.from("test"),
          filename: "regulation.html",
        })
      ).toBe(true);
      expect(
        isHtmlInput({
          buffer: Buffer.from("test"),
          filename: "act.htm",
        })
      ).toBe(true);
    });

    it("respects PDF over filename if buffer is clearly PDF", () => {
      expect(
        isHtmlInput({
          buffer: Buffer.from("%PDF-1.4 binary content"),
          filename: "document.pdf",
        })
      ).toBe(false);
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodes named entities", () => {
      expect(decodeHtmlEntities("&sect;&nbsp;1.&nbsp;M&aring;")).toBe("§ 1. M&aring;");
      expect(decodeHtmlEntities("&quot;Hello&quot; &amp; &apos;World&apos;")).toBe("\"Hello\" & 'World'");
      expect(decodeHtmlEntities("&ndash; &mdash; &hellip;")).toBe("– — …");
    });

    it("decodes decimal and hex entities", () => {
      expect(decodeHtmlEntities("&#167; 1")).toBe("§ 1");
      expect(decodeHtmlEntities("&#xA7; 1")).toBe("§ 1");
    });
  });

  describe("extractTextFromHtml", () => {
    it("converts block elements to newlines so legal headings match", () => {
      const html = `
        <div class="eli-subdivision" id="art_1">
          <p class="title-article"><strong>Artikel 1</strong></p>
          <p class="subtitle-article">Formål</p>
          <p class="normal">Ved denne forordning fastlægges reglerne.</p>
        </div>
        <div class="eli-subdivision" id="art_2">
          <p class="title-article"><strong>Artikel 2</strong></p>
          <p class="normal">Definitioner.</p>
        </div>
      `;

      const text = extractTextFromHtml(html);
      expect(text).toContain("Artikel 1\n\nFormål\n\nVed denne forordning fastlægges reglerne.");
      expect(text).toContain("Artikel 2\n\nDefinitioner.");

      // Verify that parser parses it into raw sections directly
      const sections = parsePdfTextIntoSections(text, "doc0", "EU 2023/2842");
      expect(sections.length).toBe(2);
      expect(sections[0].number).toBe(1);
      expect(sections[0].title).toBe("Formål");
      expect(sections[1].number).toBe(2);
    });

    it("strips scripts, styles, and comments", () => {
      const html = `
        <style>body { color: red; }</style>
        <script>alert("hack");</script>
        <!-- A comment -->
        <p>§ 1.</p>
        <p>Gældende ret.</p>
      `;

      const text = extractTextFromHtml(html);
      expect(text).not.toContain("alert");
      expect(text).not.toContain("color: red");
      expect(text).not.toContain("A comment");
      expect(text).toContain("§ 1.");
      expect(text).toContain("Gældende ret.");
    });

    it("preserves paragraph and section symbols", () => {
      const html = "<p>&sect; 14 a.</p><p>Fartøjer med tilladelse.</p>";
      const text = extractTextFromHtml(html);
      expect(text).toBe("§ 14 a.\n\nFartøjer med tilladelse.");

      const sections = parsePdfTextIntoSections(text + "\n\n§ 15.\nAnden bestemmelse.", "doc0", "BEK 1197");
      expect(sections.length).toBe(2);
      expect(sections[0].number).toBe(14);
      expect(sections[0].suffix).toBe("a");
    });
  });

  describe("extractTitleFromHtml", () => {
    it("extracts document title from <title> tag", () => {
      const html = "<html><head><title>Forordning (EU) 2023/2842</title></head><body></body></html>";
      expect(extractTitleFromHtml(html)).toBe("Forordning (EU) 2023/2842");
    });

    it("falls back to <h1> tag if title is missing", () => {
      const html = "<div><h1>Bekendtgørelse om fiskeri i 2025</h1><p>Indhold</p></div>";
      expect(extractTitleFromHtml(html)).toBe("Bekendtgørelse om fiskeri i 2025");
    });

    it("returns null when no title or h1 exists", () => {
      const html = "<div><p>Just content</p></div>";
      expect(extractTitleFromHtml(html)).toBeNull();
    });
  });

  describe("Danish legal acts HTML corpus parsing", () => {
    it("parses downloaded BEK 1197/2025 HTML into exactly 10 sections", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "public", "corpus", "bek-1197-2025-logbog.html");
      const content = await fs.readFile(filePath, "utf-8");

      expect(isHtmlBuffer(Buffer.from(content))).toBe(true);
      const title = extractTitleFromHtml(content);
      expect(title).toContain("BEK nr 1197");

      const text = extractTextFromHtml(content);
      const sections = parsePdfTextIntoSections(text, "doc0", "BEK 1197/2025");
      expect(sections.length).toBe(10);
      expect(sections[0].number).toBe(1);
      expect(sections[9].number).toBe(10);
    });

    it("parses downloaded LBK 205/2023 HTML into complete statutory sections", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "public", "corpus", "lbk-205-2023-fiskeriloven.html");
      const content = await fs.readFile(filePath, "utf-8");

      const text = extractTextFromHtml(content);
      const sections = parsePdfTextIntoSections(text, "doc0", "LBK 205/2023");
      expect(sections.length).toBeGreaterThan(150);
      expect(sections[0].number).toBe(1);
    });
  });
});
