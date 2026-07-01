import { analyzeCitationsAndBuildGraph, parsePdfTextIntoSections } from "../lib/parser";

describe("LexGraph Parser Accuracy & Citation Extraction", () => {
  describe("Mixed Heading Pattern Detection", () => {
    it("should match both Article and Section/Paragraph symbols in the same document if present in high density", () => {
      const text = `
        Article 1
        This is the first article. It establishes scope.
        
        Article 2
        This is the second article.
        
        § 3
        This is the third section, using a section symbol.
        
        § 4
        This is the fourth section.
      `;
      
      const sections = parsePdfTextIntoSections(text, "docA", "control", "Test Document");
      expect(sections.length).toBe(4);
      expect(sections[0].label).toBe("Test Document Art. 1");
      expect(sections[2].label).toBe("Test Document § 3");
    });
  });

  describe("Citation Parsing and Modalities", () => {
    it("should parse nested sub-references (paragraph, litra)", () => {
      const docAText = `
        Article 1
        This defines something.
      `;
      
      const docBText = `
        Article 1
        According to Document A Article 1, paragraph 2, lit. b, we must proceed.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "Document A", "Document B");
      
      // The citation target node should be created as a virtual subnode
      const subnode = result.nodes.find(n => n.id === "docA_sec_1_stk_2_litra_b");
      expect(subnode).toBeDefined();
      expect(subnode?.label).toContain("Document A Art. 1");
      expect(subnode?.label).toContain("stk. 2");
      expect(subnode?.label).toContain("litra b");

      // Verify the link
      const link = result.links.find(l => l.source === "docB_sec_1");
      expect(link).toBeDefined();
      expect(link?.target).toBe("docA_sec_1_stk_2_litra_b");
      expect(link?.modality).toBe("Obligation");
    });

    it("should resolve target document based on proximity context", () => {
      const docAText = `
        Article 5
        This is article 5.
      `;

      const docBText = `
        Article 1
        Reference to Document A Article 5 is made here.
        Article 2
        Reference to Document B Article 5 is made here.
        
        Article 5
        This is implementation article 5.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "Document A", "Document B");

      // We expect two links
      // The reference in Article 1 (Document A Article 5) should point to docA
      const link1 = result.links.find(l => l.source === "docB_sec_1");
      expect(link1).toBeDefined();
      expect(link1?.target).toBe("docA_sec_5");

      // The reference in Article 2 (Document B Article 5) should point to docB
      const link2 = result.links.find(l => l.source === "docB_sec_2");
      expect(link2).toBeDefined();
      expect(link2?.target).toBe("docB_sec_5");
    });

    it("should resolve § citations even when preceded by whitespace", () => {
      const docAText = `
        § 1
        This is the first section.

        § 7
        This is the seventh section.
      `;

      const docBText = `
        § 1
        See § 7 of Document A for details.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "Document A", "Document B");

      const link = result.links.find(l => l.source === "docB_sec_1");
      expect(link).toBeDefined();
      expect(link?.target).toBe("docA_sec_7");
    });

    it("should match extended citation variants: Chapter, Annex, Schedule, point", () => {
      const docAText = `
        Article 1
        First article.

        Article 3
        Third article.

        Article 9
        Ninth article.
      `;

      const docBText = `
        Article 1
        See Chapter 3 and Annex 9 of Document A, point (b), for details.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "Document A", "Document B");

      const links = result.links.filter(l => l.source === "docB_sec_1");
      expect(links.some(l => l.target === "docA_sec_3")).toBe(true);
      expect(links.some(l => l.target === "docA_sec_9")).toBe(true);
    });
  });

  describe("Regression fixes", () => {
    it("should throw a structured INSUFFICIENT_STRUCTURE error, not crash, when no heading pattern matches at all", () => {
      const text = "This document has no recognisable headings at all, just plain prose.";
      expect(() => parsePdfTextIntoSections(text, "docA", "control", "Test Document")).toThrow(
        expect.objectContaining({ code: "INSUFFICIENT_STRUCTURE" })
      );
    });

    it("should not collapse decimal 'N.M' hierarchical headings into the same section number", () => {
      const text = `
        3.1
        First subsection.

        3.2
        Second subsection.

        3.3
        Third subsection.
      `;
      const sections = parsePdfTextIntoSections(text, "docA", "control", "Test Document");
      expect(sections.length).toBe(3);
      const numbers = sections.map(s => s.number).sort((a, b) => a - b);
      expect(numbers).toEqual([3.1, 3.2, 3.3]);
    });

    it("should tag external (unresolvable) citation subnodes with the citing document, not always 'control'", () => {
      const docAText = `
        Article 1
        First article.
      `;
      const docBText = `
        Article 1
        See Article 99 for details.

        Article 2
        More content here.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "Document A", "Document B");
      const externalNode = result.nodes.find(n => n.id === "external_sec_99");
      expect(externalNode).toBeDefined();
      expect(externalNode?.external).toBe(true);
      // The citation to the nonexistent section 99 originates in docB (impl), so the
      // external node must be tagged "impl", not hardcoded to "control".
      expect(externalNode?.doc).toBe("impl");
    });

    it("should not misresolve the target document when one label is a substring of the other", () => {
      const docAText = `
        Article 5
        Base provision.
      `;
      const docBText = `
        Article 1
        Per EU 1224/2009 Gennemførelse Article 5, we must comply.
      `;

      const result = analyzeCitationsAndBuildGraph(docAText, docBText, "EU 1224/2009", "EU 1224/2009 Gennemførelse");
      const link = result.links.find(l => l.source === "docB_sec_1");
      expect(link).toBeDefined();
      // Only "EU 1224/2009 Gennemførelse" (labelB) is actually mentioned near the citation,
      // so it must resolve to docB (impl), not be misdetected as also mentioning labelA.
      expect(link?.target).toBe("docB_sec_5");
    });
  });
});
