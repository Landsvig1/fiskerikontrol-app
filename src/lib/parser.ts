// Helper library for parsing and analyzing citations

export interface RawArticle {
  id: string;
  number: number;
  label: string;
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
}

const THEMES: Record<string, string[]> = {
  "Licenser og tilladelser": ["licens", "tilladelse", "kapacitet", "bruttotonnage", " BT ", " kW "],
  "VMS og sporing": ["VMS", "fartøjsovervåg", "sporings", "position", "satellit", "FOS", "AIS"],
  "Logbøger og elektronisk rapportering": ["logbog", "indberetning", "ERS", "elektronisk", "fangst", "afgangsdeklaration", "forhåndsunderretning"],
  "Fiskeredskaber og motoreffekt": ["redskab", "trawl", "maskineffekt", "motorstyrke", "kW", "maskin", "motor"],
  "Landinger, vejning og salg": ["landing", "salgsnotat", "omladning", "fiskevare", "overførsel", "afhentning", "vejes", "vejning", "landingsdeklaration", "overtagelseserklæring"],
  "Inspektion og overvågning": ["inspektion", "kontrollør", "embedsmand", "observatør", "inspektionsrapport", "inspektionsfartøj", "flyvning"],
  "Sanktioner og pointsystem": ["sanktion", "point", "overtrædelse", "håndhævelse", "overtrædelser", "sanktioner"],
  "Datavalidering og systemer": ["validering", "krydskontrol", "database", "bistand", "samarbejde", "FLUX", "oplysninger", "webservice"]
};

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
  let bestTheme = "Generelt / Ramme";
  let maxMatches = 0;
  
  for (const [theme, keywords] of Object.entries(THEMES)) {
    let matches = 0;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTheme = theme;
    }
  }
  return bestTheme;
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
  sourceArt: RawArticle,
  body: string,
  docType: "control" | "impl",
  controlMap: Record<number, RawArticle>
): CitationRecord[] {
  const citations: CitationRecord[] = [];
  
  // Regex to extract: artikel X (optionally suffix), optionally stk. Y, litra Z
  const pattern = /\bartikel\s+(\d+)\s*([a-z])?(?:\s*,\s*stk\.\s*(\d+))?(?:\s*,\s*litra\s*([a-z]))?\b/gi;
  let match;
  
  while ((match = pattern.exec(body)) !== null) {
    const artNum = parseInt(match[1], 10);
    const suffix = match[2] || null;
    const stkNum = match[3] || null;
    const litraVal = match[4] || null;
    const matchIndex = match.index;
    const matchLength = match[0].length;

    // Detect context surrounding match
    const startCtx = Math.max(0, matchIndex - 100);
    const endCtx = Math.min(body.length, matchIndex + matchLength + 100);
    const context = body.substring(startCtx, endCtx).toLowerCase();
    
    const snippetStart = Math.max(0, matchIndex - 20);
    const snippetEnd = Math.min(body.length, matchIndex + matchLength + 20);
    const snippet = body.substring(snippetStart, snippetEnd).trim();

    let targetDoc: "control" | "impl" = "impl";
    if (docType === "impl") {
      if (context.includes("1224/2009") || context.includes("kontrolforordning") || context.includes("forordning (ef) nr.")) {
        targetDoc = "control";
      } else if (context.includes("denne forordning") || context.includes("nærværende forordning")) {
        targetDoc = "impl";
      } else {
        // Fallback to control if the target article exists in control map
        if (controlMap[artNum]) {
          targetDoc = "control";
        }
      }
    } else {
      targetDoc = "control";
    }

    // Determine modality
    let modality: "Obligation" | "Exception" | "Prohibition" | "Permission" = "Obligation";
    
    const exceptionRegex = /\b(?:undtagen|fritaget|fritages|uanset|afvige|undtagelse|dispensation)\b/i;
    const prohibitionRegex = /\b(?:forbudt|må\s+ikke|ikke\s+tilladt)\b/i;
    const permissionRegex = /\b(?:kan|tilladt|må|hjemmel|bemyndiget)\b/i;

    if (exceptionRegex.test(context)) {
      modality = "Exception";
    } else if (prohibitionRegex.test(context)) {
      modality = "Prohibition";
    } else if (permissionRegex.test(context)) {
      modality = "Permission";
    }

    let targetArtId = `${targetDoc}_art_${artNum}`;
    if (suffix) {
      targetArtId += `_${suffix}`;
    }

    let targetNodeId = targetArtId;
    if (stkNum) {
      targetNodeId += `_stk_${stkNum}`;
      if (litraVal) {
        targetNodeId += `_litra_${litraVal}`;
      }
    }

    citations.push({
      source: sourceArt.id,
      target: targetNodeId,
      target_art: targetArtId,
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

export function analyzeCitationsAndBuildGraph(controlText: string, implText: string): ParseResult {
  const control = parsePdfTextIntoArticles(controlText, "control");
  const impl = parsePdfTextIntoArticles(implText, "impl");

  const controlMap: Record<number, RawArticle> = {};
  for (const art of control) {
    controlMap[art.number] = art;
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Add primary articles as nodes
  for (const art of control) {
    nodes.push({
      id: art.id,
      number: art.number,
      label: `Ramme Art. ${art.number}`,
      title: art.title,
      doc: "control",
      theme: detectTheme(art.title, art.body),
      body: art.body
    });
  }

  for (const art of impl) {
    nodes.push({
      id: art.id,
      number: art.number,
      label: `Regler Art. ${art.number}`,
      title: art.title,
      doc: "impl",
      theme: detectTheme(art.title, art.body),
      body: art.body
    });
  }

  // Parse citations
  const citationRecords: CitationRecord[] = [];
  for (const art of control) {
    citationRecords.push(...parseCitations(art, art.body, "control", controlMap));
  }
  for (const art of impl) {
    citationRecords.push(...parseCitations(art, art.body, "impl", controlMap));
  }

  // Add virtual subnodes for paragraphs (stk./litra)
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const cit of citationRecords) {
    if (!nodeIds.has(cit.target)) {
      const parentNode = nodes.find(n => n.id === cit.target_art);
      
      let label = `${cit.target_doc === "control" ? "Ramme" : "Regler"} Art. ${cit.target_art_num}`;
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
        title: parentNode ? `Underafsnit af Art. ${cit.target_art_num}` : "Ekstern reference",
        doc: cit.target_doc,
        theme: parentNode ? parentNode.theme : "Generelt / Ramme",
        body: parentNode ? `Se hovedartiklen: ${parentNode.label} (${parentNode.title})` : "Ekstern reference",
        is_subnode: true,
        parent_id: cit.target_art
      });
      nodeIds.add(cit.target);
    }
  }

  // Build links
  for (const cit of citationRecords) {
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
          description: `Potentiel konflikt: En artikel undtager/fritager, mens en anden pålægger eller forbyder i forhold til ${targetId}.`,
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
    conflicts
  };
}
