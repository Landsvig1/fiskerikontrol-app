// Helper library for parsing and analyzing citations

export interface DocRef {
  id: string;      // stable per-document key, e.g. "doc0", "doc1", ... — assigned by upload order
  label: string;
}

/** Internal type — describes a heading pattern used for multi-pattern section detection. */
interface HeadingPattern {
  name: "article" | "section" | "paragraph" | "numbered" | "hierarchical";
  regex: RegExp;      // captures (fullMatch, number)
  prefix: string;     // abbreviation: "Art.", "Sec.", "§"
  priority: number;   // tiebreaker: lower = higher priority
}

/** Internal type — a parsed document section. */
interface RawSection {
  id: string;         // {docId}_sec_{number}
  number: number;
  label: string;      // "{userLabel} {prefix} {number}"
  title: string;
  body: string;
  doc: string;         // docId
}

export interface GraphNode {
  id: string;
  number: number;
  label: string;
  title: string;
  doc: string;          // docId
  theme: string;
  body: string;
  is_subnode?: boolean;
  parent_id?: string;
  external?: boolean;   // true for virtual subnodes that reference unknown sections
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  modality: "Obligation" | "Exception" | "Prohibition" | "Permission";
  snippet: string;
  context: string;
}

export interface OverlapRecord {
  target: string;
  sources: string[];
  count: number;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
  }>;
}

export interface ConflictRecord {
  target: string;
  modalities: string[];
  description: string;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
    context: string;
  }>;
}

export interface ParseResult {
  nodes: GraphNode[];
  links: GraphLink[];
  overlaps: OverlapRecord[];
  conflicts: ConflictRecord[];
  docs: DocRef[];
}

const THEMES: Record<string, { da: string[]; en: string[] }> = {
  "Definitions and Scope": {
    da: ["definitioner", "anvendelsesområde", "formål", "defineres", "gælder for", "finder anvendelse"],
    en: ["definitions", "scope", "purpose", "means", "applies to", "shall apply", "objective"],
  },
  "Obligations and Duties": {
    da: ["skal", "pligtig", "forpligtet", "krav", "forpligtelse", "påkrævet"],
    en: ["shall", "must", "required", "obligation", "duty", "mandatory", "compulsory"],
  },
  "Rights and Permissions": {
    da: ["ret", "kan", "tilladt", "bemyndiget", "hjemmel", "tilladelse"],
    en: ["right", "may", "permitted", "allowed", "authorised", "authorized", "entitled"],
  },
  "Exceptions and Exemptions": {
    da: ["undtagen", "undtagelse", "fritaget", "dispensation", "uanset", "afvige"],
    en: ["except", "exception", "exempt", "exemption", "derogation", "notwithstanding", "waiver"],
  },
  "Enforcement and Sanctions": {
    da: ["sanktion", "straf", "bøde", "håndhævelse", "overtrædelse", "tilsyn"],
    en: ["sanction", "penalty", "fine", "enforcement", "violation", "infringement", "supervision"],
  },
  "Reporting and Documentation": {
    da: ["rapport", "indberetning", "dokumentation", "register", "journal", "oplysninger"],
    en: ["report", "reporting", "documentation", "record", "register", "information", "data"],
  },
  "Procedures and Processes": {
    da: ["procedure", "fremgangsmåde", "proces", "ansøgning", "godkendelse", "behandling"],
    en: ["procedure", "process", "application", "approval", "assessment", "review", "steps"],
  },
  "Transitional and Final Provisions": {
    da: ["overgangs", "ikrafttræden", "ophæves", "afløser", "slutbestemmelse", "afsluttende"],
    en: ["transitional", "entry into force", "repealed", "replaces", "final provisions", "concluding"],
  },
  "General": { da: [], en: [] },
};

const PATTERNS: HeadingPattern[] = [
  {
    name: "article",
    regex: /(?:^|\n)[ \t]*((?:article|artikel)\s+(\d+))\b/gi,
    prefix: "Art.",
    priority: 1,
  },
  {
    name: "section",
    regex: /(?:^|\n)[ \t]*(section\s+(\d+))\b/gi,
    prefix: "Sec.",
    priority: 2,
  },
  {
    name: "paragraph",
    regex: /(?:^|\n)[ \t]*(§\s*(\d+))\b/gi,
    prefix: "§",
    priority: 3,
  },
  {
    name: "hierarchical",
    regex: /(?:^|\n)[ \t]*((\d+)\.(\d+))[ \t]*$/gm,
    prefix: "§",
    priority: 4,
  },
  {
    name: "numbered",
    regex: /(?:^|\n)[ \t]*((\d+)\.)[ \t]*$/gm,
    prefix: "§",
    priority: 5,
  },
];

function detectTheme(title: string, body: string): string {
  const combined = (title + " " + body).toLowerCase();
  let bestTheme = "General";
  let maxMatches = 0;

  for (const [theme, { da, en }] of Object.entries(THEMES)) {
    if (theme === "General") continue;
    let matches = 0;
    for (const kw of da) {
      if (combined.includes(kw.toLowerCase())) matches++;
    }
    for (const kw of en) {
      if (combined.includes(kw.toLowerCase())) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTheme = theme;
    }
    // On tie, keep "General" (bestTheme stays unchanged because strict > is used)
  }
  return bestTheme;
}

export function parsePdfTextIntoSections(
  text: string,
  docId: string,
  userLabel: string
): RawSection[] {
  // Normalize text
  let cleanText = text.replace(/\u00a0/g, " ");
  cleanText = cleanText.replace(/\r\n/g, "\n");

  // Pass 1 — count matches per pattern (reset regex lastIndex before each count)
  const counts: number[] = PATTERNS.map(p => {
    const re = new RegExp(p.regex.source, p.regex.flags);
    let count = 0;
    while (re.exec(cleanText) !== null) count++;
    return count;
  });

  // Pass 2 — select dominant pattern: highest count, tie → lowest priority number
  let dominantIdx = -1;
  let dominantCount = 0;
  for (let i = 0; i < PATTERNS.length; i++) {
    const c = counts[i];
    if (c > dominantCount) {
      dominantCount = c;
      dominantIdx = i;
    } else if (c === dominantCount && dominantIdx >= 0) {
      // Tie-break: lower priority number wins
      if (PATTERNS[i].priority < PATTERNS[dominantIdx].priority) {
        dominantIdx = i;
      }
    }
  }

  // No pattern matched at all — dominantIdx is still -1, so there is no "dominant" pattern
  // to report on. Handle this before indexing PATTERNS, which would otherwise throw a raw
  // TypeError instead of the structured INSUFFICIENT_STRUCTURE error the caller expects.
  if (dominantIdx < 0) {
    const patternCounts = Object.fromEntries(PATTERNS.map((p, i) => [p.name, counts[i]]));
    throw {
      code: "INSUFFICIENT_STRUCTURE",
      message: `No sections matched any known heading pattern. Detected pattern counts: ${JSON.stringify(patternCounts)}.`,
      patternCounts,
      docKey: docId,
    };
  }

  const dominant = PATTERNS[dominantIdx];

  // Weak numeric-only patterns (no anchoring keyword) require at least 2 matches to
  // guard against a single accidental numbered line being mistaken for a heading.
  // Strong keyword-anchored patterns (article/section/§) are trusted from a single match,
  // since real documents can legitimately consist of just one article/section.
  const isWeakPattern = dominant.name === "hierarchical" || dominant.name === "numbered";
  const minRequired = isWeakPattern ? 2 : 1;

  if (dominantCount < minRequired) {
    const patternCounts = Object.fromEntries(PATTERNS.map((p, i) => [p.name, counts[i]]));
    const primaryLabel = dominant.name.charAt(0).toUpperCase() + dominant.name.slice(1);
    throw {
      code: "INSUFFICIENT_STRUCTURE",
      message: dominantCount === 0
        ? `No sections matched the primary pattern: ${primaryLabel}. Detected pattern counts: ${JSON.stringify(patternCounts)}.`
        : `Document contains fewer than ${minRequired} detected section(s) (found ${dominantCount} matching "${primaryLabel}"). Detected pattern counts: ${JSON.stringify(patternCounts)}.`,
      patternCounts,
      docKey: docId,
    };
  }

  const selectedPatterns = [dominant];

  // Find other compatible patterns that are present in high density (>= 20% of dominant count)
  const textSymbolicPatterns = ["article", "section", "paragraph"];
  if (textSymbolicPatterns.includes(dominant.name)) {
    for (let i = 0; i < PATTERNS.length; i++) {
      if (i === dominantIdx) continue;
      const p = PATTERNS[i];
      if (textSymbolicPatterns.includes(p.name) && counts[i] >= Math.max(2, dominantCount * 0.2)) {
        selectedPatterns.push(p);
      }
    }
  }

  const matchList: { number: number; displayNumber: string; index: number; end: number; prefix: string }[] = [];
  for (const p of selectedPatterns) {
    const re = new RegExp(p.regex.source, p.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleanText)) !== null) {
      let num: number;
      let displayNumber: string;
      if (p.name === "hierarchical") {
        // The "hierarchical" pattern captures decimal headings like "3.1": group 1 is the
        // full "N.M" text, group 2 the major number, group 3 the minor number. Using group 2
        // alone would collapse "3.1", "3.2", "3.3" to the same section number. parseFloat(m[1])
        // isn't safe either — it collides multi-digit minors sharing a prefix, e.g.
        // parseFloat("3.1") === parseFloat("3.10") === 3.1. Encode major/minor into a single
        // unique integer instead (minor capped far below 1000 for any realistic document),
        // which also preserves numeric sort order across majors, but keep the original "N.M"
        // text separately so the section label still displays "3.1", not the encoded integer.
        const major = parseInt(m[2], 10);
        const minor = parseInt(m[3], 10);
        num = major * 1000 + minor;
        displayNumber = m[1];
      } else {
        num = parseInt(m[2], 10);
        displayNumber = m[2];
      }
      matchList.push({ number: num, displayNumber, index: m.index, end: re.lastIndex, prefix: p.prefix });
    }
  }

  // Sort matches by index to keep correct document order
  matchList.sort((a, b) => a.index - b.index);

  const sections: RawSection[] = [];
  for (let i = 0; i < matchList.length; i++) {
    const curr = matchList[i];
    const startIdx = curr.end;
    const endIdx = i + 1 < matchList.length ? matchList[i + 1].index : cleanText.length;

    const content = cleanText.substring(startIdx, endIdx).trim();
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

    let title = "";
    let bodyLines = lines;
    if (lines.length > 0 && lines[0].length <= 120) {
      title = lines[0];
      bodyLines = lines.slice(1);
    }
    const body = bodyLines.join("\n");

    sections.push({
      id: `${docId}_sec_${curr.number}`,
      number: curr.number,
      label: `${userLabel} ${curr.prefix} ${curr.displayNumber}`,
      title,
      body,
      doc: docId,
    });
  }

  // Deduplication: keep longest body; on tie keep first occurrence
  const byNum: Record<number, RawSection> = {};
  for (const sec of sections) {
    if (!byNum[sec.number]) {
      byNum[sec.number] = sec;
    } else if (sec.body.length > byNum[sec.number].body.length) {
      byNum[sec.number] = sec;
    }
  }

  return Object.keys(byNum)
    .map(Number)
    .sort((a, b) => a - b)
    .map(num => byNum[num]);
}

// Bilingual citation regex: matches article/artikel/section/§/clause/klausul/chapter/kapitel/annex/bilag/schedule + number + optional paragraph + optional sub-references (litra/point/lit.)
// The § symbol is punctuation, not a word character, so \b never matches immediately before it
// when preceded by whitespace (the common case) — it is given its own boundary-free alternative below.
const CITATION_RE = /(?:\b(?:article|artikel|section|clause|klausul|chapter|kapitel|annex|bilag|schedule)\s+|§\s*)(\d+)\s*([a-z])?(?:\s*,\s*(?:paragraph|stk\.|para\.)\s*(\d+))?(?:\s*,\s*(?:litra|point|lit\.)\s*\(?([a-z])\)?)?\b/gi;

// Bilingual modality signal regexes — evaluated in priority order: Exception → Prohibition → Permission → Obligation
const EXCEPTION_RE = /\b(?:undtagen|fritaget|fritages|uanset|afvige|undtagelse|dispensation|notwithstanding|except(?:ed)?|by\s+way\s+of\s+derogation|derogation|waiver)\b/i;
const PROHIBITION_RE = /\b(?:forbudt|må\s+ikke|ikke\s+tilladt|prohibited|shall\s+not|must\s+not|not\s+permitted)\b/i;
const PERMISSION_RE = /\b(?:kan|tilladt|må|hjemmel|bemyndiget|may|permitted|allowed|authorised|authorized|entitled\s+to)\b/i;

interface CitationRecord {
  source: string;
  target: string;
  target_art: string;
  target_doc: string;
  target_art_num: number;
  target_stk: string | null;
  target_litra: string | null;
  modality: "Obligation" | "Exception" | "Prohibition" | "Permission";
  snippet: string;
  context: string;
}

function parseCitations(
  sourceSection: RawSection,
  body: string,
  sourceDocId: string,
  sectionMaps: Record<string, Record<number, RawSection>>,
  labels: DocRef[]
): CitationRecord[] {
  const citations: CitationRecord[] = [];

  // Precompute once per call, not once per citation match: each label's lowercased form,
  // and which other labels are strict supersets of it (used below to strip a superstring
  // label before checking a substring label, e.g. "EU 1224/2009" vs. "EU 1224/2009
  // Gennemførelse"). This relationship only depends on `labels`, not on where in the body
  // the current match is, so recomputing it per match was O(numDocs^2) wasted work per
  // citation occurrence.
  const lowerById = new Map(labels.map(l => [l.id, l.label.toLowerCase()]));
  const supersetsOf = new Map<string, string[]>();
  for (const l of labels) {
    const lLower = lowerById.get(l.id)!;
    const supersets: string[] = [];
    if (lLower) {
      for (const other of labels) {
        if (other.id === l.id) continue;
        const oLower = lowerById.get(other.id)!;
        if (oLower && oLower !== lLower && oLower.includes(lLower)) {
          supersets.push(oLower);
        }
      }
    }
    supersetsOf.set(l.id, supersets);
  }

  // Reset regex state before each use
  const pattern = new RegExp(CITATION_RE.source, CITATION_RE.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const artNum = parseInt(match[1], 10);
    const suffix = match[2] || null;
    const stkNum = match[3] || null;
    const litraVal = match[4] || null;
    const matchIndex = match.index;
    const matchLength = match[0].length;

    // Extract context window around the match
    const startCtx = Math.max(0, matchIndex - 100);
    const endCtx = Math.min(body.length, matchIndex + matchLength + 100);
    const context = body.substring(startCtx, endCtx).toLowerCase();

    const snippetStart = Math.max(0, matchIndex - 20);
    const snippetEnd = Math.min(body.length, matchIndex + matchLength + 20);
    const snippet = body.substring(snippetStart, snippetEnd).trim();

    // Determine target document. Step 1: proximity context signal (within 150 chars) — if
    // exactly one document's label is mentioned nearby, that's an unambiguous, explicit
    // signal and wins outright. Step 2 (structural fallback, only reached when zero or 2+
    // labels matched nearby): check which *other* documents define a section numbered
    // artNum. Exactly one candidate wins by elimination; zero or 2+ candidates fall back to
    // self-reference — guessing wrong among ambiguous candidates would fabricate a specific
    // incorrect cross-reference, while self-reference never actively misleads.
    const proximityStart = Math.max(0, matchIndex - 150);
    const proximityEnd = Math.min(body.length, matchIndex + matchLength + 150);
    const proximityText = body.substring(proximityStart, proximityEnd).toLowerCase();

    // If one label is a substring of another (common for base-act vs. implementing-act
    // naming, e.g. "EU 1224/2009" vs. "EU 1224/2009 Gennemførelse"), a mention of the longer
    // label would otherwise also register as a match for the shorter one. Strip occurrences
    // of any superstring label before searching for a given label so each check only counts
    // a standalone mention.
    const proximityMatches: string[] = [];
    for (const l of labels) {
      const lLower = lowerById.get(l.id)!;
      if (!lLower) continue;
      let text = proximityText;
      for (const oLower of supersetsOf.get(l.id)!) {
        text = text.split(oLower).join(" ");
      }
      if (text.includes(lLower)) proximityMatches.push(l.id);
    }

    let targetDoc: string;
    if (proximityMatches.length === 1) {
      targetDoc = proximityMatches[0];
    } else {
      const candidateDocIds = labels
        .map(l => l.id)
        .filter(id => id !== sourceDocId && !!sectionMaps[id]?.[artNum]);
      targetDoc = candidateDocIds.length === 1 ? candidateDocIds[0] : sourceDocId;
    }

    // Determine modality — evaluate in priority order: Exception → Prohibition → Permission → Obligation
    let modality: "Obligation" | "Exception" | "Prohibition" | "Permission" = "Obligation";
    if (EXCEPTION_RE.test(context)) {
      modality = "Exception";
    } else if (PROHIBITION_RE.test(context)) {
      modality = "Prohibition";
    } else if (PERMISSION_RE.test(context)) {
      modality = "Permission";
    }

    // Build target IDs using the new _sec_ format
    let targetSecId = `${targetDoc}_sec_${artNum}`;
    if (suffix) {
      targetSecId += `_${suffix}`;
    }

    let targetNodeId = targetSecId;
    if (stkNum) {
      targetNodeId += `_stk_${stkNum}`;
      if (litraVal) {
        targetNodeId += `_litra_${litraVal}`;
      }
    }

    citations.push({
      source: sourceSection.id,
      target: targetNodeId,
      target_art: targetSecId,
      target_doc: targetDoc,
      target_art_num: artNum,
      target_stk: stkNum,
      target_litra: litraVal,
      modality,
      snippet,
      context: body.substring(Math.max(0, matchIndex - 60), Math.min(body.length, matchIndex + matchLength + 60)).trim()
    });
  }

  return citations;
}

export function analyzeCitationsAndBuildGraph(docs: { text: string; label: string }[]): ParseResult {
  if (docs.length < 2) {
    throw {
      code: "TOO_FEW_DOCUMENTS",
      message: `At least 2 documents are required to build a citation graph (received ${docs.length}).`,
    };
  }

  const docRefs: DocRef[] = docs.map((d, i) => ({ id: `doc${i}`, label: d.label }));

  const sectionsByDoc: RawSection[][] = docs.map((d, i) =>
    parsePdfTextIntoSections(d.text, docRefs[i].id, d.label)
  );

  const sectionMaps: Record<string, Record<number, RawSection>> = {};
  sectionsByDoc.forEach((sections, i) => {
    const map: Record<number, RawSection> = {};
    for (const sec of sections) {
      map[sec.number] = sec;
    }
    sectionMaps[docRefs[i].id] = map;
  });

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Add primary sections as nodes
  for (const sections of sectionsByDoc) {
    for (const sec of sections) {
      nodes.push({
        id: sec.id,
        number: sec.number,
        label: sec.label,
        title: sec.title,
        doc: sec.doc,
        theme: detectTheme(sec.title, sec.body),
        body: sec.body
      });
    }
  }

  // Parse citations from all sections. Scan title+body together: short single-line
  // sections get their entire content classified as "title" by the heading splitter,
  // which would otherwise leave citations embedded in that text undetected.
  const citationRecords: CitationRecord[] = [];
  sectionsByDoc.forEach((sections, i) => {
    const docId = docRefs[i].id;
    for (const sec of sections) {
      const fullText = [sec.title, sec.body].filter(Boolean).join("\n");
      citationRecords.push(...parseCitations(sec, fullText, docId, sectionMaps, docRefs));
    }
  });

  const docLabelById: Record<string, string> = {};
  for (const d of docRefs) {
    docLabelById[d.id] = d.label;
  }

  // Add virtual subnodes for paragraphs (stk./litra) and external references
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const cit of citationRecords) {
    if (!nodeIds.has(cit.target)) {
      const parentNode = nodes.find(n => n.id === cit.target_art);

      // Check if the target section exists in any document
      const targetSecNum = cit.target_art_num;
      const existsSomewhere = docRefs.some(d => !!sectionMaps[d.id][targetSecNum]);
      const isExternal = !existsSomewhere && !parentNode;

      if (isExternal) {
        // Create external virtual subnode for unresolvable citations. Qualified by target_doc
        // so that different documents independently citing the same nonexistent section number
        // don't collide into one node tagged with only the first citation's document.
        const externalId = `external_${cit.target_doc}_sec_${targetSecNum}`;
        if (!nodeIds.has(externalId)) {
          nodes.push({
            id: externalId,
            number: targetSecNum,
            label: `External ref. ${targetSecNum}`,
            title: "Unresolved external reference",
            doc: cit.target_doc,
            theme: "General",
            body: "Referenced section not found in any document.",
            is_subnode: true,
            parent_id: undefined,
            external: true,
          });
          nodeIds.add(externalId);
        }
        // Redirect citation target to the external node
        cit.target = externalId;
        cit.target_art = externalId;
      } else {
        // Regular subnode (stk./litra reference)
        let label = parentNode ? parentNode.label : `${docLabelById[cit.target_doc] ?? cit.target_doc} sec. ${targetSecNum}`;
        if (cit.target_stk) {
          label += `, stk. ${cit.target_stk}`;
          if (cit.target_litra) {
            label += `, litra ${cit.target_litra}`;
          }
        }

        nodes.push({
          id: cit.target,
          number: cit.target_art_num,
          label,
          title: parentNode ? `Subsection of ${parentNode.label}` : `Section ${targetSecNum}`,
          doc: cit.target_doc,
          theme: parentNode ? parentNode.theme : "General",
          body: parentNode ? `See parent section: ${parentNode.label} (${parentNode.title})` : "External reference",
          is_subnode: true,
          parent_id: cit.target_art
        });
        nodeIds.add(cit.target);
      }
    }
  }

  // Build links with deduplication — keyed on "source|target|modality"
  const seen = new Set<string>();
  for (const cit of citationRecords) {
    const key = `${cit.source}|${cit.target}|${cit.modality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      source: cit.source,
      target: cit.target,
      type: "citation",
      modality: cit.modality,
      snippet: cit.snippet,
      context: cit.context
    });
  }

  // Detect overlaps and conflicts — already N-agnostic: groups by target, sources/citations
  // are plain arrays with no assumption about how many distinct documents they span.
  const targetCitations: Record<string, CitationRecord[]> = {};
  for (const cit of citationRecords) {
    if (!targetCitations[cit.target]) {
      targetCitations[cit.target] = [];
    }
    targetCitations[cit.target].push(cit);
  }

  const overlaps: OverlapRecord[] = [];
  const conflicts: ConflictRecord[] = [];

  for (const [targetId, cits] of Object.entries(targetCitations)) {
    if (cits.length > 1) {
      const sources = Array.from(new Set(cits.map(c => c.source)));
      overlaps.push({
        target: targetId,
        sources,
        count: cits.length,
        citations: cits.map(c => ({
          source: c.source,
          modality: c.modality,
          snippet: c.snippet
        }))
      });

      const modalities = new Set(cits.map(c => c.modality));
      const targetNode = nodes.find(n => n.id === targetId);

      // Only generate conflicts on real substantive sections in the corpus (exclude external unresolved placeholders)
      if (targetNode && !targetNode.external && !targetId.startsWith("external_")) {
        if (modalities.has("Exception") && (modalities.has("Obligation") || modalities.has("Prohibition"))) {
          conflicts.push({
            target: targetId,
            modalities: Array.from(modalities),
            description: `Potential conflict: one section creates an exception/exemption while another imposes an obligation or prohibition regarding ${targetNode.label || targetId}.`,
            citations: cits.map(c => ({
              source: c.source,
              modality: c.modality,
              snippet: c.snippet,
              context: c.context
            }))
          });
        }
      }
    }
  }

  return {
    nodes,
    links,
    overlaps,
    conflicts,
    docs: docRefs
  };
}
