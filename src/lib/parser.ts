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
  "Licenser & Tilladelser": {
    da: ["licens", "fiskerilicens", "tilladelse", "fiskeritilladelse", "kapacitet", "maskineffekt", "motoreffekt", "adgang til farvande", "kvote", "fartøjsregister", "autorisat", "motorstyrke", "fiskerimuligheder", "fiskeriindsats", "fartøjslængde", "fartøjsliste"],
    en: ["license", "licence", "authorization", "authorisation", "permit", "capacity", "engine power", "quota", "vessel register", "fishing opportunities", "effort"],
  },
  "VMS, Sporing & AIS": {
    da: ["vms", "fartøjsovervågning", "fartøjssporing", "satellit", "ais", "positionsdata", "geofenc", "sporing", "fos-data", "automatisk identifikation", "overvågningscenter", "fartøjsovervågningssystem", "satellitbaseret"],
    en: ["vms", "vessel monitoring", "tracking", "satellite", "ais", "position data", "geofencing", "automatic identification", "monitoring centre", "fmc"],
  },
  "Fangst & Logbog": {
    da: ["logbog", "fiskerilogbog", "fangst", "e-logbog", "fiskeredskab", "redskab", "maskestørrelse", "bifangst", "om bord", "estimer", "tolerance", "marint affald", "tabte redskaber", "pingere", "fangstfarvande", "fangstregistrering", "akustiske alarmer", "fiskerejser", "farvandsjournal", "omregningsfaktor"],
    en: ["logbook", "fishing logbook", "catch", "e-logbook", "gear", "fishing gear", "mesh size", "bycatch", "on board", "onboard", "estimate", "margin of tolerance", "marine litter", "lost gear", "pingers", "conversion factor"],
  },
  "Forhåndsanmeldelse & Anløb": {
    da: ["forhåndsmeddelelse", "forhåndsanmeldelse", "anløb", "udpegede havne", "udpeget havn", "havneanløb", "ankomst", "forudgående meddelelse", "notifikation", "anløbe havn", "forhåndsunderretning", "anløbstilladelse"],
    en: ["prior notification", "prior notice", "port call", "designated port", "designated ports", "arrival", "prior arrival", "entry to port"],
  },
  "Landing & Omladning": {
    da: ["omladning", "omladnings", "landing", "landinger", "losning", "udsmid", "landingsforpligtelse", "landingspligt", "om bord opbevaret", "omladningsaktiviteter", "omladningsopgørelse", "lossetidspunkt", "losseprocedure"],
    en: ["transhipment", "transshipment", "landing", "landings", "unloading", "discards", "landing obligation", "landing operations"],
  },
  "Vejning & Landingsopgørelse": {
    da: ["landingsopgørelse", "landingserklæring", "vejning", "vejepligt", "vejet", "vejeseddel", "kalibrering", "overtagelseserklæring", "transportdokument", "vejeprocedure", "vejesystem", "vejebestemmelser", "vejeresultat", "vejeattest", "vejekontrol"],
    en: ["landing declaration", "weighing", "weighed", "weighing scales", "takeover declaration", "transport document", "weighing system", "sample weighing"],
  },
  "Salgsnotater & Førsteomsætning": {
    da: ["salgsnotat", "salgsnota", "salgsdokument", "førsteomsætning", "første salg", "opkøber", "auktion", "registreret køber", "afsætning", "producentorganisation", "førstehåndssalg", "opkøbererklæring", "overtagelse af fiskerivarer"],
    en: ["sales note", "sales notes", "first sale", "buyer", "registered buyer", "auction", "marketing", "producer organisation", "first-hand sale"],
  },
  "Sporbarhed & Mærkning": {
    da: ["sporbarhed", "mærkning", "parti", "partier", "lot", "forbrugeroplysning", "produktinformation", "stregkode", "mærkning af fiskeredskaber", "partikontrol", "mærkning af fangst", "sporbarhedssystem", "artsmærkning"],
    en: ["traceability", "labelling", "labeling", "lot", "lots", "batch", "consumer information", "product information", "barcode", "rfid"],
  },
  "Kontrol, Tilsyn & REM": {
    da: ["inspektion", "kontrollør", "embedsmand", "observatør", "cctv", "kamera", "overvågning", "inspektionsrapport", "kontrolprogram", "kontrolmyndighed", "tilsyn", "elektronisk monitorering", "rem-system", "inspektionsfartøj", "fysisk kontrol", "kontrolkampagne"],
    en: ["inspection", "inspector", "official", "observer", "cctv", "camera", "surveillance", "inspection report", "control programme", "monitoring", "rem", "remote electronic monitoring"],
  },
  "Sanktioner & Pointsystem": {
    da: ["sanktion", "point", "pointsystem", "alvorlig overtrædelse", "overtrædelse", "bøde", "retsforfølgning", "straf", "inddragelse", "strafansvar", "forseelse", "håndhævelsesforanstaltning", "administrativ sanktion"],
    en: ["sanction", "points", "point system", "serious infringement", "infringement", "fine", "penalty", "prosecution", "confiscation", "suspension"],
  },
  "Datavalidering & Samarbejde": {
    da: ["validering", "krydskontrol", "database", "it-system", "dataudveksling", "administrativt samarbejde", "tavshedspligt", "informationsudveksling", "gensidig bistand", "nationalt register", "kommissionens kontrol", "rapporteringsforpligtelse", "personoplysninger"],
    en: ["validation", "cross-check", "database", "data exchange", "administrative cooperation", "confidentiality", "exchange of information", "mutual assistance", "reporting obligation"],
  },
  "Definitioner & Retsgrundlag": {
    da: ["definition", "anvendelsesområde", "genstand", "formål", "ikrafttræden", "ophævelse", "overgangsbestemmelse", "overgangsforanstaltninger", "slutbestemmelse", "retsorden", "forhold til andre", "bemyndigelse", "delegerede retsakter", "udvalgsprocedure", "generelle principper", "henvisninger"],
    en: ["definition", "definitions", "scope", "subject matter", "objective", "entry into force", "repeal", "transitional provisions", "final provisions", "legal basis", "delegated acts", "committee"],
  },
  "Generelle Bestemmelser": { da: [], en: [] },
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
  const lowerTitle = (title || "").toLowerCase();

  // Priority 1: Title matching
  for (const [theme, { da, en }] of Object.entries(THEMES)) {
    if (theme === "Generelle Bestemmelser") continue;
    for (const kw of da) {
      if (lowerTitle.includes(kw.toLowerCase())) return theme;
    }
    for (const kw of en) {
      if (lowerTitle.includes(kw.toLowerCase())) return theme;
    }
  }

  // Priority 2: Full text score
  let bestTheme = "Generelle Bestemmelser";
  let maxMatches = 0;

  for (const [theme, { da, en }] of Object.entries(THEMES)) {
    if (theme === "Generelle Bestemmelser") continue;
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

// Bilingual citation regex: matches article/artikel/art./section/sec./§/clause/chapter/annex/bilag + number + optional paragraph + optional sub-references (litra/point/lit./nr.)
const CITATION_RE = /(?:\b(?:artiklerne|artikels|artikler|artiklen|artikel|articles|article|art\.|arts\.|art|sections|section|sec\.|secs\.|sec|paragraf|paragraffer|klausul|clause|kapitel|kap\.|chapter|ch\.|annex|bilag|schedule)\s*|§§?\s*)(\d+)\s*([a-z])?(?:\s*,\s*(?:paragraph|stk\.|stk|stykke|para\.)\s*(\d+))?(?:\s*,\s*(?:litra|point|lit\.|nr\.|nr)\s*\(?([a-z0-9]+)\)?)?\b/gi;

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
    const matchedPrefix = match[0].toLowerCase();
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

    const snippetStart = Math.max(0, matchIndex - 25);
    const snippetEnd = Math.min(body.length, matchIndex + matchLength + 25);
    const snippet = body.substring(snippetStart, snippetEnd).trim();

    // Proximity window to identify referenced document
    const proximityStart = Math.max(0, matchIndex - 160);
    const proximityEnd = Math.min(body.length, matchIndex + matchLength + 160);
    const proximityText = body.substring(proximityStart, proximityEnd).toLowerCase();

    const proximityMatches: string[] = [];
    for (const l of labels) {
      const lLower = lowerById.get(l.id)!;
      if (!lLower) continue;

      let text = proximityText;
      for (const oLower of supersetsOf.get(l.id)!) {
        text = text.split(oLower).join(" ");
      }

      if (text.includes(lLower)) {
        proximityMatches.push(l.id);
        continue;
      }

      // Check for standalone regulation/act number in proximity (e.g. "1224/2009", "2023/2842", "1197/2025")
      const actNumMatch = l.label.match(/\b(\d{2,4}\/\d{2,4}|\d{3,5})\b/);
      if (actNumMatch) {
        const actNum = actNumMatch[1].toLowerCase();
        if (text.includes(actNum)) {
          proximityMatches.push(l.id);
          continue;
        }
      }

      // Specialized shorthand naming (e.g. "kontrolforordning", "grundforordning", "logbogbekendtgørelse")
      if (l.label.toLowerCase().includes("1224") && (text.includes("kontrolforordning") || text.includes("forordning (ef) nr. 1224"))) {
        proximityMatches.push(l.id);
      } else if (l.label.toLowerCase().includes("1380") && (text.includes("grundforordning") || text.includes("cfp"))) {
        proximityMatches.push(l.id);
      }
    }

    const uniqueProximityMatches = Array.from(new Set(proximityMatches));

    let targetDoc: string;
    const isArtPrefix = matchedPrefix.startsWith("art") || matchedPrefix.includes("artikel") || matchedPrefix.includes("article");
    const isParagraphPrefix = matchedPrefix.startsWith("§") || matchedPrefix.includes("paragraf");
    const sourceLabel = lowerById.get(sourceDocId) || "";
    const sourceIsDanishOrder = sourceLabel.includes("bek") || sourceLabel.includes("lov");
    const sourceIsEuRegulation = sourceLabel.includes("eu") || sourceLabel.includes("forordning");

    if (uniqueProximityMatches.length === 1) {
      targetDoc = uniqueProximityMatches[0];
    } else if (uniqueProximityMatches.length > 1) {
      // Prioritize documents other than source if multiple mentioned
      const foreign = uniqueProximityMatches.find(id => id !== sourceDocId && !!sectionMaps[id]?.[artNum]);
      targetDoc = foreign || uniqueProximityMatches[0];
    } else {
      // Structural and prefix type-aware fallback
      if (isArtPrefix && sourceIsDanishOrder) {
        // Danish order citing Art. X is referencing an EU Regulation
        const euCandidates = labels
          .map(l => l.id)
          .filter(id => {
            const lbl = lowerById.get(id) || "";
            return (lbl.includes("eu") || lbl.includes("forordning")) && !!sectionMaps[id]?.[artNum];
          });
        targetDoc = euCandidates.length > 0 ? euCandidates[0] : (labels.find(l => (lowerById.get(l.id) || "").includes("eu"))?.id || sourceDocId);
      } else if (isParagraphPrefix && sourceIsEuRegulation) {
        // EU regulation citing § X is referencing a National Order
        const natCandidates = labels
          .map(l => l.id)
          .filter(id => {
            const lbl = lowerById.get(id) || "";
            return (lbl.includes("bek") || lbl.includes("lov")) && !!sectionMaps[id]?.[artNum];
          });
        targetDoc = natCandidates.length > 0 ? natCandidates[0] : sourceDocId;
      } else {
        // Check if current doc defines artNum
        if (sectionMaps[sourceDocId]?.[artNum]) {
          targetDoc = sourceDocId;
        } else {
          const candidateDocIds = labels
            .map(l => l.id)
            .filter(id => id !== sourceDocId && !!sectionMaps[id]?.[artNum]);
          targetDoc = candidateDocIds.length === 1 ? candidateDocIds[0] : sourceDocId;
        }
      }
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
            description: `Potentiel regulatorisk modstrid: Én bestemmelse fastsætter en undtagelse/lempelse, mens en anden bestemmelse pålægger en bindende forpligtelse eller et forbud vedrørende ${targetNode.label || targetId}.`,
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
