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

      const sections = parsePdfTextIntoSections(text, "doc0", "Test Document");
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      // The citation target node should be created as a virtual subnode
      const subnode = result.nodes.find(n => n.id === "doc0_sec_1_stk_2_litra_b");
      expect(subnode).toBeDefined();
      expect(subnode?.label).toContain("Document A Art. 1");
      expect(subnode?.label).toContain("stk. 2");
      expect(subnode?.label).toContain("litra b");

      // Verify the link
      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      expect(link?.target).toBe("doc0_sec_1_stk_2_litra_b");
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      // We expect two links
      // The reference in Article 1 (Document A Article 5) should point to doc0
      const link1 = result.links.find(l => l.source === "doc1_sec_1");
      expect(link1).toBeDefined();
      expect(link1?.target).toBe("doc0_sec_5");

      // The reference in Article 2 (Document B Article 5) should point to doc1
      const link2 = result.links.find(l => l.source === "doc1_sec_2");
      expect(link2).toBeDefined();
      expect(link2?.target).toBe("doc1_sec_5");
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      expect(link?.target).toBe("doc0_sec_7");
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      const links = result.links.filter(l => l.source === "doc1_sec_1");
      expect(links.some(l => l.target === "doc0_sec_3")).toBe(true);
      expect(links.some(l => l.target === "doc0_sec_9")).toBe(true);
    });
  });

  describe("Regression fixes", () => {
    it("should throw a structured INSUFFICIENT_STRUCTURE error, not crash, when no heading pattern matches at all", () => {
      const text = "This document has no recognisable headings at all, just plain prose.";
      expect(() => parsePdfTextIntoSections(text, "doc0", "Test Document")).toThrow(
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
      const sections = parsePdfTextIntoSections(text, "doc0", "Test Document");
      expect(sections.length).toBe(3);
      // Section numbers are an internal encoding (major*1000+minor), not the literal decimal —
      // what matters is they're distinct and the label still displays the original "N.M" text.
      const numbers = sections.map(s => s.number);
      expect(new Set(numbers).size).toBe(3);
      expect(sections.map(s => s.label).sort()).toEqual([
        "Test Document § 3.1",
        "Test Document § 3.2",
        "Test Document § 3.3",
      ]);
    });

    it("should not collapse hierarchical headings whose minor numbers share a digit prefix (3.1 vs 3.10)", () => {
      const text = `
        3.1
        First subsection.

        3.10
        Tenth subsection.
      `;
      const sections = parsePdfTextIntoSections(text, "doc0", "Test Document");
      expect(sections.length).toBe(2);
      const numbers = sections.map(s => s.number);
      expect(new Set(numbers).size).toBe(2);
      expect(sections.map(s => s.label).sort()).toEqual([
        "Test Document § 3.1",
        "Test Document § 3.10",
      ]);
    });

    it("should tag external (unresolvable) citation subnodes with the citing document, not always the first document", () => {
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);
      const externalNode = result.nodes.find(n => n.id === "external_doc1_sec_99");
      expect(externalNode).toBeDefined();
      expect(externalNode?.external).toBe(true);
      // The citation to the nonexistent section 99 originates in doc1, so the
      // external node must be tagged "doc1", not hardcoded to "doc0".
      expect(externalNode?.doc).toBe("doc1");
    });

    it("should not collide external subnodes when both documents independently cite the same nonexistent section", () => {
      const docAText = `
        Article 1
        See Article 42 elsewhere.
      `;
      const docBText = `
        Article 1
        Also see Article 42 elsewhere.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);
      const doc0External = result.nodes.find(n => n.id === "external_doc0_sec_42");
      const doc1External = result.nodes.find(n => n.id === "external_doc1_sec_42");
      expect(doc0External).toBeDefined();
      expect(doc1External).toBeDefined();
      expect(doc0External?.doc).toBe("doc0");
      expect(doc1External?.doc).toBe("doc1");
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

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "EU 1224/2009" },
        { text: docBText, label: "EU 1224/2009 Gennemførelse" },
      ]);
      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      // Only "EU 1224/2009 Gennemførelse" (doc1's label) is actually mentioned near the
      // citation, so it must resolve to doc1, not be misdetected as also mentioning doc0's label.
      expect(link?.target).toBe("doc1_sec_5");
    });
  });

  describe("N-document citation resolution", () => {
    it("resolves an ambiguous article-number citation across 3 documents to self-reference when 2+ other docs define it and no proximity label matches", () => {
      const doc0 = `
        Article 5
        Some baseline text.
      `;
      const doc1 = `
        Article 5
        Also has article 5.

        Article 9
        See Article 5 for details.
      `;
      const doc2 = `
        Article 5
        Defines something else.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: doc0, label: "Base Act" },
        { text: doc1, label: "Impl A" },
        { text: doc2, label: "Impl B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_9");
      expect(link).toBeDefined();
      // doc0 and doc2 both independently define Article 5 — ambiguous, so the citation
      // in doc1 (which also has its own Article 5) falls back to self-reference.
      expect(link?.target).toBe("doc1_sec_5");
    });

    it("resolves unambiguously to the single other document that defines the cited article number", () => {
      const doc0 = `
        Article 1
        Baseline.
      `;
      const doc1 = `
        Article 1
        Refers to article 7 for the exception.
      `;
      const doc2 = `
        Article 7
        The exception provision.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: doc0, label: "Base Act" },
        { text: doc1, label: "Impl A" },
        { text: doc2, label: "Impl B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      // Only doc2 defines Article 7 among the other documents — unambiguous by elimination.
      expect(link?.target).toBe("doc2_sec_7");
    });

    it("still resolves via proximity label match when one of 3+ document names is mentioned near the citation", () => {
      const doc0 = `
        Article 5
        This is article 5.
      `;
      const doc1 = `
        Article 1
        Reference to Base Act Article 5 is made here.

        Article 5
        This is implementation article 5.
      `;
      const doc2 = `
        Article 1
        Unrelated third document, not involved in the citation above.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: doc0, label: "Base Act" },
        { text: doc1, label: "Impl A" },
        { text: doc2, label: "Impl B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      // "Base Act" (doc0's label) is mentioned nearby, so the proximity match wins outright
      // even though doc1 also independently defines its own Article 5.
      expect(link?.target).toBe("doc0_sec_5");
    });

    it("throws a structured TOO_FEW_DOCUMENTS error when fewer than 2 documents are provided", () => {
      expect(() => analyzeCitationsAndBuildGraph([{ text: "Article 1\nOnly one document.", label: "Solo" }])).toThrow(
        expect.objectContaining({ code: "TOO_FEW_DOCUMENTS" })
      );
    });
  });
});
