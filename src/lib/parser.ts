// Helper library for parsing and analyzing citations

/**
 * @deprecated Use RawSection instead. RawArticle will be removed in a future refactor step.
 */
export interface RawArticle {
  id: string;
  number: number;
  label: string;
  title: string;
  body: string;
  doc: "control" | "impl";
}

/** Internal type — describes a heading pattern used for multi-pattern section detection. */
interface HeadingPattern {
  name: "article" | "section" | "paragraph" | "numbered" | "hierarchical";
  regex: RegExp;      // captures (fullMatch, number)
  prefix: string;     // abbreviation: "Art.", "Sec.", "§"
  priority: number;   // tiebreaker: lower = higher priority
}

/** Internal type — a parsed document section (replaces RawArticle internally). */
interface RawSection {
  id: string;         // {docKey}_sec_{number}
  number: number;
  label: string;      // "{userLabel} {prefix} {number}"
  title: string;
  body: string;
  doc: "control" | "impl";
}

export interface GraphNode {
  id: string;
  number: number;
  label: string;
  title: string;
  doc: "control" | "impl";
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
  labelA: string;
  labelB: string;
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

function cleanArticles(articles: RawArticle[]): RawArticle[] {
  const byNum: Record<number, RawArticle> = {};
  for (const art of articles) {
    const num = art.number;
    if (!byNum[num]) {
      byNum[num] = art;
    } else {
      if (art.body.length > byNum[num].body.length) {
        byNum[num] = art;
      }
    }
  }
  return Object.keys(byNum)
    .map(Number)
    .sort((a, b) => a - b)
    .map(num => byNum[num]);
}

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
  docKey: "docA" | "docB",
  docRole: "control" | "impl",
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
      docKey,
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

  const matchList: { number: number; index: number; end: number; prefix: string }[] = [];
  for (const p of selectedPatterns) {
    const re = new RegExp(p.regex.source, p.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleanText)) !== null) {
      const numStr = m[2];
      const num = parseInt(numStr, 10);
      matchList.push({ number: num, index: m.index, end: re.lastIndex, prefix: p.prefix });
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
      id: `${docKey}_sec_${curr.number}`,
      number: curr.number,
      label: `${userLabel} ${curr.prefix} ${curr.number}`,
      title,
      body,
      doc: docRole,
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

export function parsePdfTextIntoArticles(text: string, docName: "control" | "impl"): RawArticle[] {
  // Normalize whitespace
  let cleanText = text.replace(/\u00a0/g, " ");
  cleanText = cleanText.replace(/\r\n/g, "\n");

  const pattern = /(?:\n|^)\s*(Artikel\s+(\d+))\b/g;
  const matches: { label: string; number: number; index: number; end: number }[] = [];
  
  let match;
  while ((match = pattern.exec(cleanText)) !== null) {
    matches.push({
      label: match[1],
      number: parseInt(match[2], 10),
      index: match.index,
      end: pattern.lastIndex
    });
  }

  const articles: RawArticle[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const startIdx = m.end;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : cleanText.length;

    const content = cleanText.substring(startIdx, endIdx).trim();
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    
    let title = "";
    let bodyLines = lines;
    if (lines.length > 0) {
      if (lines[0].length < 120) {
        title = lines[0];
        bodyLines = lines.slice(1);
      }
    }
    const body = bodyLines.join("\n");

    articles.push({
      id: `${docName}_art_${m.number}`,
      number: m.number,
      label: `${docName === "control" ? "Ramme" : "Regler"} Art. ${m.number}`,
      title,
      body,
      doc: docName
    });
  }

  return cleanArticles(articles);
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
  target_doc: "control" | "impl";
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
  docType: "control" | "impl",
  controlMap: Record<number, RawSection>,
  labelA: string,
  labelB: string
): CitationRecord[] {
  const citations: CitationRecord[] = [];

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

    // Determine target document using proximity context signals (within 150 chars), then structural fallback
    let targetDoc: "control" | "impl" = "impl";
    const labelALower = labelA.toLowerCase();
    const labelBLower = labelB.toLowerCase();

    const proximityStart = Math.max(0, matchIndex - 150);
    const proximityEnd = Math.min(body.length, matchIndex + matchLength + 150);
    const proximityText = body.substring(proximityStart, proximityEnd).toLowerCase();

    const hasA = labelALower && proximityText.includes(labelALower);
    const hasB = labelBLower && proximityText.includes(labelBLower);

    if (hasA && !hasB) {
      targetDoc = "control";
    } else if (hasB && !hasA) {
      targetDoc = "impl";
    } else if (docType === "impl") {
      if (controlMap[artNum]) {
        targetDoc = "control";
      } else {
        targetDoc = "impl";
      }
    } else {
      targetDoc = "control";
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
    let targetSecId = `${targetDoc === "control" ? "docA" : "docB"}_sec_${artNum}`;
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

export function analyzeCitationsAndBuildGraph(controlText: string, implText: string, labelA: string, labelB: string): ParseResult {
  const control = parsePdfTextIntoSections(controlText, "docA", "control", labelA);
  const impl = parsePdfTextIntoSections(implText, "docB", "impl", labelB);

  const controlMap: Record<number, RawSection> = {};
  for (const sec of control) {
    controlMap[sec.number] = sec;
  }

  const implMap: Record<number, RawSection> = {};
  for (const sec of impl) {
    implMap[sec.number] = sec;
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Add primary sections as nodes
  for (const sec of control) {
    nodes.push({
      id: sec.id,
      number: sec.number,
      label: sec.label,
      title: sec.title,
      doc: "control",
      theme: detectTheme(sec.title, sec.body),
      body: sec.body
    });
  }

  for (const sec of impl) {
    nodes.push({
      id: sec.id,
      number: sec.number,
      label: sec.label,
      title: sec.title,
      doc: "impl",
      theme: detectTheme(sec.title, sec.body),
      body: sec.body
    });
  }

  // Parse citations from all sections. Scan title+body together: short single-line
  // sections get their entire content classified as "title" by the heading splitter,
  // which would otherwise leave citations embedded in that text undetected.
  const citationRecords: CitationRecord[] = [];
  for (const sec of control) {
    const fullText = [sec.title, sec.body].filter(Boolean).join("\n");
    citationRecords.push(...parseCitations(sec, fullText, "control", controlMap, labelA, labelB));
  }
  for (const sec of impl) {
    const fullText = [sec.title, sec.body].filter(Boolean).join("\n");
    citationRecords.push(...parseCitations(sec, fullText, "impl", controlMap, labelA, labelB));
  }

  // Add virtual subnodes for paragraphs (stk./litra) and external references
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const cit of citationRecords) {
    if (!nodeIds.has(cit.target)) {
      const parentNode = nodes.find(n => n.id === cit.target_art);

      // Check if the target section exists in either document
      const targetSecNum = cit.target_art_num;
      const existsInControl = !!controlMap[targetSecNum];
      const existsInImpl = !!(implMap[targetSecNum]);
      const isExternal = !existsInControl && !existsInImpl && !parentNode;

      if (isExternal) {
        // Create external virtual subnode for unresolvable citations
        const externalId = `external_sec_${targetSecNum}`;
        if (!nodeIds.has(externalId)) {
          nodes.push({
            id: externalId,
            number: targetSecNum,
            label: `External ref. ${targetSecNum}`,
            title: "Unresolved external reference",
            doc: "control",  // placeholder discriminant
            theme: "General",
            body: "Referenced section not found in either document.",
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
        let label = parentNode ? parentNode.label : `${cit.target_doc === "control" ? labelA : labelB} sec. ${targetSecNum}`;
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

  // Detect overlaps and conflicts
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
      if (modalities.has("Exception") && (modalities.has("Obligation") || modalities.has("Prohibition"))) {
        conflicts.push({
          target: targetId,
          modalities: Array.from(modalities),
          description: `Potential conflict: one section creates an exception/exemption while another imposes an obligation or prohibition regarding ${targetId}.`,
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

  return {
    nodes,
    links,
    overlaps,
    conflicts,
    labelA,
    labelB
  };
}
