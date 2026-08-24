import { analyzeCitationsAndBuildGraph, parsePdfTextIntoSections } from "../lib/parser";

const FILLER_DOC = {
  text: `Artikel 1
Uafhaengig bestemmelse
Denne bestemmelse henviser ikke til noget.
`,
  label: "EU 9/2026",
};

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

  describe("Heading pattern election", () => {
    it("prefers keyword-anchored headings over more numerous bare numeric lines", () => {
      // Mirrors EU 1224/2009: 285 "Artikel N" headings competing with 481 bare "N." list
      // items that are paragraph numbers *inside* those articles.
      const text = `
Artikel 1
Genstand
1.
Denne forordning fastsaetter regler.
2.
Reglerne gaelder for alle fartoejer.
3.
Kommissionen kan vedtage regler.

Artikel 2
Anvendelsesomraade
1.
Forordningen finder anvendelse.
2.
Den gaelder ikke for fritidsfiskeri.
3.
Undtagelser fastsaettes saerskilt.
      `;

      const sections = parsePdfTextIntoSections(text, "doc0", "EU Test");
      expect(sections).toHaveLength(2);
      expect(sections[0].label).toBe("EU Test Art. 1");
      expect(sections[1].label).toBe("EU Test Art. 2");
      expect(sections[0].title).toBe("Genstand");
    });

    it("still uses bare numeric outlines when no keyword headings exist", () => {
      const text = `
1.
Scope of this document.
2.
Definitions used throughout.
3.
Final provisions.
      `;

      const sections = parsePdfTextIntoSections(text, "doc0", "Outline Doc");
      expect(sections).toHaveLength(3);
      expect(sections[0].label).toBe("Outline Doc § 1");
    });
  });

  describe("Lettered amendment articles", () => {
    it("treats glued EU article suffixes as sections distinct from their base article", () => {
      const text = `
Artikel 15
Elektronisk indsendelse
Foereren indsender data.

Artikel 15a
Elektronisk fiskerilogbog
Saerlige regler for smaa fartoejer.

Artikel 16
Stikproevekontrol
Medlemsstaterne kontrollerer.
      `;

      const sections = parsePdfTextIntoSections(text, "doc0", "EU 1224/2009");
      const ids = sections.map(s => s.id);
      expect(ids).toContain("doc0_sec_15");
      expect(ids).toContain("doc0_sec_15_a");
      expect(sections.find(s => s.id === "doc0_sec_15_a")?.title).toBe("Elektronisk fiskerilogbog");
      expect(sections.find(s => s.id === "doc0_sec_15")?.title).toBe("Elektronisk indsendelse");
    });

    it("handles the Danish space-separated paragraph suffix", () => {
      const text = `
§ 6
Udvalget for Erhvervsfiskeri
Udvalget raadgiver ministeren.

§ 6 a
Udvalget for Muslingeproduktion
Udvalget raadgiver om muslinger.

§ 7
Ikrafttraeden
Loven traeder i kraft.
      `;

      const sections = parsePdfTextIntoSections(text, "doc0", "LBK 205/2023");
      const ids = sections.map(s => s.id);
      expect(ids).toContain("doc0_sec_6");
      expect(ids).toContain("doc0_sec_6_a");
      expect(sections.find(s => s.id === "doc0_sec_6_a")?.label).toBe("LBK 205/2023 § 6 a");
      expect(sections.find(s => s.id === "doc0_sec_6_a")?.title).toBe("Udvalget for Muslingeproduktion");
    });

    it("does not mistake a heading title's first letter for a suffix", () => {
      const text = `
§ 7
Fiskeritilladelse
Ministeren fastsaetter regler.

§ 8
Havbrug
Reglerne gaelder ogsaa her.
      `;

      const sections = parsePdfTextIntoSections(text, "doc0", "BEK Test");
      expect(sections.map(s => s.id)).toEqual(["doc0_sec_7", "doc0_sec_8"]);
      expect(sections[0].title).toBe("Fiskeritilladelse");
      expect(sections[1].title).toBe("Havbrug");
    });
  });

  describe("Regressions found in review of 87361c3..0d96ce4", () => {
    it("does not discard a lone keyword heading in favour of the list items inside it", () => {
      // strong.count === 1 and weak.count >= 2. Before the fix the weak branch won and the
      // single real article was thrown away, leaving three spurious numbered sections.
      const text = `Artikel 1
Anvendelsesomraade
Denne forordning gaelder for alt fiskeri.
1.
foerste led i listen
2.
andet led i listen
3.
tredje led i listen
`;

      const sections = parsePdfTextIntoSections(text, "doc0", "TEST 1/2026");
      expect(sections.map(s => s.id)).toEqual(["doc0_sec_1"]);
      expect(sections[0].label).toBe("TEST 1/2026 Art. 1");
      expect(sections[0].title).toBe("Anvendelsesomraade");
    });

    it("still elects the numeric outline when there is no keyword heading at all", () => {
      const text = `1.
Formaal
Reglerne fastlaegger rammen.
2.
Anvendelse
Reglerne gaelder for fartoejer.
`;

      const sections = parsePdfTextIntoSections(text, "doc0", "TEST 2/2026");
      expect(sections.map(s => s.id)).toEqual(["doc0_sec_1", "doc0_sec_2"]);
    });

    it("resolves a Danish space-separated lettered citation to the lettered provision", () => {
      // "§ 6 a" parses as a heading, so a citation written the same way must reach it rather
      // than silently landing on the base provision § 6.
      const text = `§ 5
Henvisning
Udvalget nedsaettes, jf. § 6 a, og skal hoeres.

§ 6
Udvalget for Erhvervsfiskeri
Udvalget raadgiver ministeren.

§ 6 a
Udvalget for Muslingeproduktion
Udvalget raadgiver om muslinger.
`;

      const graph = analyzeCitationsAndBuildGraph([{ text, label: "LBK 205/2023" }, FILLER_DOC]);
      const fromSec5 = graph.links.filter(l => l.source === "doc0_sec_5");
      expect(fromSec5.map(l => l.target)).toContain("doc0_sec_6_a");
      expect(fromSec5.map(l => l.target)).not.toContain("doc0_sec_6");
    });

    it("does not let the spaced suffix form leak onto article citations", () => {
      // The article branch must keep the glued-only rule, otherwise "artikel 5 F" swallows
      // the first letter of the following word.
      const text = `Artikel 4
Henvisning
Reglerne finder anvendelse, jf. artikel 5 Foerste betingelse er opfyldt.

Artikel 5
Betingelser
Betingelserne fastlaegges her.
`;

      const graph = analyzeCitationsAndBuildGraph([{ text, label: "EU 1/2026" }, FILLER_DOC]);
      const targets = graph.links.filter(l => l.source === "doc0_sec_4").map(l => l.target);
      expect(targets).toContain("doc0_sec_5");
      expect(targets).not.toContain("doc0_sec_5_f");
    });

    it("resolves an uppercase lettered citation to the same node as the heading", () => {
      const text = `Artikel 3
Henvisning
Kravet gaelder, jf. ARTIKEL 15A.

Artikel 15a
Elektronisk fiskerilogbog
Saerlige regler for smaa fartoejer.
`;

      const graph = analyzeCitationsAndBuildGraph([{ text, label: "EU 1224/2009" }, FILLER_DOC]);
      const targets = graph.links.filter(l => l.source === "doc0_sec_3").map(l => l.target);
      expect(targets).toContain("doc0_sec_15_a");
      expect(graph.nodes.filter(n => n.id === "doc0_sec_15_A")).toHaveLength(0);
    });

    it("never makes a placeholder node its own parent", () => {
      // A citation to a provision the target document does not define creates a placeholder.
      // Setting parent_id to its own id breaks parent lookups and hierarchy rendering.
      const text = `Artikel 1
Henvisning
Kravet gaelder, jf. artikel 99.
`;

      const graph = analyzeCitationsAndBuildGraph([{ text, label: "EU 1/2026" }, FILLER_DOC]);
      expect(graph.nodes.filter(n => n.parent_id === n.id)).toHaveLength(0);
    });
  });

  describe("Citation regex precision", () => {
    it("does not read the Danish preposition 'i' as an article letter suffix", () => {
      const docAText = `
        Artikel 15
        Indsendelse af logbogsdata.
      `;
      const docBText = `
        Artikel 1
        Forpligtelsen i artikel 15 i forordning (EU) nr. 1380/2013 finder anvendelse.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "EU 1224/2009" },
        { text: docBText, label: "BEK 1197/2025" },
      ]);

      expect(result.nodes.some(n => /_sec_15_i$/.test(n.id))).toBe(false);
      expect(result.nodes.some(n => n.id === "doc0_sec_15")).toBe(true);
    });

    it("does not absorb the first letter of the cited article's own title", () => {
      const docAText = `
        Artikel 57
        Faelles handelsnormer
        Medlemsstaterne kontrollerer normerne.
      `;
      const docBText = `
        Artikel 1
        Reglerne i artikel 57 finder anvendelse.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Doc A" },
        { text: docBText, label: "Doc B" },
      ]);

      expect(result.nodes.some(n => /_sec_57_f$/.test(n.id))).toBe(false);
    });

    it("still parses letter suffixes written without a space", () => {
      const docAText = `
        Artikel 2a
        Kapacitetslofter.
      `;
      const docBText = `
        Artikel 1
        Som fastsat i artikel 2a gaelder saerlige regler.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Doc A" },
        { text: docBText, label: "Doc B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_1");
      expect(link).toBeDefined();
      expect(link?.target).toMatch(/_sec_2_a$/);
    });

    it("does not treat Danish 'art' meaning species as an article reference", () => {
      const docAText = `
        Artikel 4
        Definitioner.
      `;
      const docBText = `
        Artikel 1
        Der anvendes en tolerancemargen paa 20 % for hver art. 4 procent er graensen.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Doc A" },
        { text: docBText, label: "Doc B" },
      ]);

      const bogus = result.links.find(l => l.source === "doc1_sec_1" && l.target === "doc0_sec_4");
      expect(bogus).toBeUndefined();
    });

    it("still resolves the English 'Art. N' abbreviation", () => {
      const docAText = `
        Article 4
        Definitions.
      `;
      const docBText = `
        Article 1
        As set out in Art. 4, operators shall comply.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Doc A" },
        { text: docBText, label: "Doc B" },
      ]);

      const link = result.links.find(l => l.source === "doc1_sec_1" && l.target === "doc0_sec_4");
      expect(link).toBeDefined();
    });
  });

  describe("Cross-document flagging", () => {
    it("marks links as cross-document when the citing and cited sections live in different docs", () => {
      const docAText = `
        Article 1
        This defines the baseline weighing obligation.

        Article 2
        Vessels shall report catches.
      `;

      const docBText = `
        Article 1
        By way of derogation from Document A Article 1, small vessels are exempted.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      const crossDocLinks = result.links.filter(l => l.isCrossDoc);
      expect(crossDocLinks.length).toBeGreaterThan(0);

      for (const link of crossDocLinks) {
        const source = result.nodes.find(n => n.id === link.source);
        const target = result.nodes.find(n => n.id === link.target);
        expect(source?.doc).not.toBe(target?.doc);
      }
    });

    it("does not flag same-document citations as cross-document", () => {
      const docAText = `
        Article 1
        This defines the baseline.

        Article 2
        In accordance with Article 1, operators shall comply.
      `;

      const docBText = `
        Article 1
        Unrelated national provision.
      `;

      const result = analyzeCitationsAndBuildGraph([
        { text: docAText, label: "Document A" },
        { text: docBText, label: "Document B" },
      ]);

      const selfLink = result.links.find(
        l => l.source === "doc0_sec_2" && l.target === "doc0_sec_1"
      );
      expect(selfLink).toBeDefined();
      expect(selfLink?.isCrossDoc).toBe(false);
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
      // Section numbers are an internal encoding (major*1000+minor), not the literal decimal ,
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
      // doc0 and doc2 both independently define Article 5, ambiguous, so the citation
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
      // Only doc2 defines Article 7 among the other documents, unambiguous by elimination.
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
