import { GraphData, GraphNode } from "./types";
import { euSupremacyApplies } from "./jurisdiction";
import { FleetFilterCriteria, matchesFleetCriteria } from "./fleetFilter";
import { Lang } from "./i18n";

export interface AuditMemoOptions {
  data: GraphData;
  criteria?: FleetFilterCriteria;
  lang?: Lang;
  caseworkerName?: string;
  departmentName?: string;
  caseReference?: string;
  date?: string;
}

export function generateAuditMemoMarkdown(options: AuditMemoOptions): string {
  const {
    data,
    criteria = { vesselLength: "all", gearType: "all", seaArea: "all" },
    lang = "da",
    caseworkerName = "Fiskeristyrelsen, Sagsbehandler & Kontrolledelse",
    departmentName = "Enheden for Fiskerikontrol & Retsgrundlag",
    caseReference = `LEX-AUDIT-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    date = new Date().toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  } = options;

  const filteredNodes = data.nodes.filter((node) => matchesFleetCriteria(node, criteria));
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  // Conflicts come from the parser's ConflictRecord set (data.conflicts) so the memo,
  // the Conflicts view and the Conflict Inspector always agree on what a conflict is.
  // Each record is a target section that received both an Exception and an
  // Obligation/Prohibition citation; we expand it into one entry per citing section.
  const conflicts: Array<{ source: GraphNode; target: GraphNode; modality: string }> = [];
  data.conflicts.forEach((record) => {
    const targetNode = nodeMap.get(record.target);
    if (!targetNode) return;

    for (const citation of record.citations) {
      const sourceNode = nodeMap.get(citation.source);
      if (!sourceNode) continue;

      // Keep the conflict if either side is in scope for the selected fleet segment.
      if (!matchesFleetCriteria(sourceNode, criteria) && !matchesFleetCriteria(targetNode, criteria)) {
        continue;
      }

      conflicts.push({ source: sourceNode, target: targetNode, modality: citation.modality });
    }
  });

  const docNames = data.docs.map((d) => d.label || d.id).join(", ");

  const lines: string[] = [];

  // Header Block
  lines.push(`# ${lang === "da" ? "JURIDISK TILSYNSNOTAT & COMPLIANCE-AUDIT" : "LEGAL AUDIT & COMPLIANCE MEMO"}`);
  lines.push(`**${lang === "da" ? "Myndighed" : "Authority"}:** ${departmentName}`);
  lines.push(`**${lang === "da" ? "Sagsreference" : "Case Ref"}:** ${caseReference}`);
  lines.push(`**${lang === "da" ? "Dato" : "Date"}:** ${date}`);
  lines.push(`**${lang === "da" ? "Sagsbehandler" : "Caseworker / Officer"}:** ${caseworkerName}`);
  lines.push(`\n---\n`);

  // 1. Executive Summary
  lines.push(`## 1. ${lang === "da" ? "Resumé & Retsgrundlag" : "Executive Summary & Legal Scope"}`);
  lines.push(
    lang === "da"
      ? `Dette tilsynsnotat sammenfatter krydshenvisninger, bindende forpligtelser og identificerede modsigelser mellem de analyserede forskrifter:`
      : `This compliance memo synthesizes cross-citations, binding obligations, and identified statutory conflicts across the analyzed regulations:`
  );
  lines.push(`\n- **${lang === "da" ? "Analyserede retskilder" : "Analyzed regulations"}:** ${docNames}`);
  lines.push(`- **${lang === "da" ? "Gennemgåede sektioner" : "Analyzed sections"}:** ${filteredNodes.length} ${lang === "da" ? "sektioner" : "sections"}`);
  lines.push(`- **${lang === "da" ? "Krydsreferencer mellem dokumenter" : "Cross-document citations"}:** ${data.links.filter((l) => l.isCrossDoc).length}`);
  // conflicts[] is expanded to one entry per citing section, so its length is a pair count,
  // not a conflict count. The Conflicts view counts distinct target sections, and the two
  // numbers must not disagree in a document that goes to a caseworker.
  const conflictTargetCount = new Set(conflicts.map((c) => c.target.id)).size;
  lines.push(`- **${lang === "da" ? "Identificerede modsigelser / konflikter" : "Identified conflicts / contradictions"}:** ${conflictTargetCount}`);
  lines.push(`- **${lang === "da" ? "Berørte henvisningspar" : "Affected citation pairs"}:** ${conflicts.length}`);
  lines.push(`\n`);

  // 2. Active Scenario Filter
  lines.push(`## 2. ${lang === "da" ? "Gældende Flådescenarie" : "Applicable Fleet Scenario"}`);
  lines.push(`- **${lang === "da" ? "Fartøjsstørrelse" : "Vessel length"}:** ${criteria.vesselLength}`);
  lines.push(`- **${lang === "da" ? "Redskabstype" : "Gear type"}:** ${criteria.gearType}`);
  lines.push(`- **${lang === "da" ? "Farvandsområde" : "Sea area"}:** ${criteria.seaArea}`);
  lines.push(`\n`);

  // 3. Identified Conflicts
  lines.push(`## 3. ${lang === "da" ? "Identificerede Retskonflikter & Fortolkningsrisici" : "Identified Legal Conflicts & Risks"}`);
  if (conflicts.length === 0) {
    lines.push(
      lang === "da"
        ? `*Ingen direkte retskonflikter eller modstridende undtagelser konstateret for det valgte flådesegment.*`
        : `*No direct legal conflicts or contradictory exemptions detected for the selected fleet segment.*`
    );
  } else {
    conflicts.forEach((c, index) => {
      lines.push(`### 3.${index + 1} ${c.source.label} ⟷ ${c.target.label}`);
      lines.push(`- **${lang === "da" ? "Citerende sektion" : "Citing Section"}:** ${c.source.label} (${c.source.title || "Uden titel"})`);
      lines.push(`- **${lang === "da" ? "Citeret målsektion" : "Cited Section"}:** ${c.target.label} (${c.target.title || "Uden titel"})`);
      lines.push(`- **${lang === "da" ? "Modalitetsrelation" : "Modality Relation"}:** ${c.modality}`);
      lines.push(`\n**${c.source.label} ${lang === "da" ? "lovtekst" : "text"}:**`);
      lines.push(`> "${c.source.body.slice(0, 300)}..."`);
      lines.push(`\n**${c.target.label} ${lang === "da" ? "lovtekst" : "text"}:**`);
      lines.push(`> "${c.target.body.slice(0, 300)}..."`);
      lines.push(`\n**${lang === "da" ? "Juridisk vurdering & forrang" : "Legal Assessment & Precedence"}:**`);
      // Same gate as the Conflicts view in page.tsx, so the memo and the screen cannot diverge.
      const euSupremacy = euSupremacyApplies(data.docs, c.source, c.target);
      lines.push(
        euSupremacy
          ? (lang === "da"
              ? `Ved modstrid har EU-forordninger forrang frem for nationale bekendtgørelser (*EU-retlig forrang*). Sagsbehandlere og kontrolførere bør sikre, at nationale dispensationsbestemmelser ikke undergraver EU-harmoniserede kontrolkrav.`
              : `In case of contradiction, EU regulations take precedence over national orders (EU legal supremacy). Enforcement officers must verify national derogations conform to EU mandates.`)
          : (lang === "da"
              ? `Retslig afklaring påkrævet. Der foreligger modstridende modaliteter mellem bestemmelserne, men forholdet er ikke et EU/national forrangsspørgsmål ud fra dokumentbetegnelserne. Delegerede retsakter og bekendtgørelser skal fortolkes i overensstemmelse med grundforordningens kontrolformål.`
              : `Clarification required. Contradictory modalities exist between the provisions, but the relationship is not an EU versus national precedence question based on the document labels. Secondary acts must be interpreted in compliance with baseline control objectives.`)
      );
      lines.push(`\n`);
    });
  }

  // 4. Sign-off
  lines.push(`## 4. ${lang === "da" ? "Konklusion & Godkendelse" : "Conclusion & Formal Sign-off"}`);
  lines.push(
    lang === "da"
      ? `Notatet er genereret som operationelt arbejdsgrundlag for tilsynsaktiviteter og administrativ sagsbehandling.\n`
      : `This memo is generated as an operational basis for inspection activities and administrative case processing.\n`
  );
  lines.push(`_____________________________________________`);
  lines.push(`${caseworkerName}`);
  lines.push(`${departmentName}`);

  return lines.join("\n");
}
