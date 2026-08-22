import { GraphData, GraphNode } from "./types";
import { euSupremacyApplies } from "./jurisdiction";
import { FleetFilterCriteria, matchesFleetCriteria } from "./fleetFilter";

export interface AuditMemoOptions {
  data: GraphData;
  criteria?: FleetFilterCriteria;
  caseworkerName?: string;
  departmentName?: string;
  caseReference?: string;
  date?: string;
}

export function generateAuditMemoMarkdown(options: AuditMemoOptions): string {
  const {
    data,
    criteria = { vesselLength: "all", gearType: "all", seaArea: "all" },
    caseworkerName = "Fiskeristyrelsen, Sagsbehandler & Kontrolledelse",
    departmentName = "Enheden for Fiskerikontrol & Retsgrundlag",
    caseReference = `LEX-AUDIT-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    date = new Date().toLocaleDateString("da-DK", {
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
  lines.push(`# JURIDISK TILSYNSNOTAT & COMPLIANCE-AUDIT`);
  lines.push(`**Myndighed:** ${departmentName}`);
  lines.push(`**Sagsreference:** ${caseReference}`);
  lines.push(`**Dato:** ${date}`);
  lines.push(`**Sagsbehandler:** ${caseworkerName}`);
  lines.push(`\n---\n`);

  // 1. Executive Summary
  lines.push(`## 1. Resumé & Retsgrundlag`);
  lines.push(
    `Dette tilsynsnotat sammenfatter krydshenvisninger, bindende forpligtelser og identificerede modsigelser mellem de analyserede forskrifter:`
  );
  lines.push(`\n- **Analyserede retskilder:** ${docNames}`);
  lines.push(`- **Gennemgåede sektioner:** ${filteredNodes.length} sektioner`);
  lines.push(`- **Krydsreferencer mellem dokumenter:** ${data.links.filter((l) => l.isCrossDoc).length}`);
  // conflicts[] is expanded to one entry per citing section, so its length is a pair count,
  // not a conflict count. The Conflicts view counts distinct target sections, and the two
  // numbers must not disagree in a document that goes to a caseworker.
  const conflictTargetCount = new Set(conflicts.map((c) => c.target.id)).size;
  lines.push(`- **Identificerede modsigelser / konflikter:** ${conflictTargetCount}`);
  lines.push(`- **Berørte henvisningspar:** ${conflicts.length}`);
  lines.push(`\n`);

  // 2. Active Scenario Filter
  lines.push(`## 2. Gældende Flådescenarie`);
  lines.push(`- **Fartøjsstørrelse:** ${criteria.vesselLength}`);
  lines.push(`- **Redskabstype:** ${criteria.gearType}`);
  lines.push(`- **Farvandsområde:** ${criteria.seaArea}`);
  lines.push(`\n`);

  // 3. Identified Conflicts
  lines.push(`## 3. Identificerede Retskonflikter & Fortolkningsrisici`);
  if (conflicts.length === 0) {
    lines.push(
      `*Ingen direkte retskonflikter eller modstridende undtagelser konstateret for det valgte flådesegment.*`
    );
  } else {
    conflicts.forEach((c, index) => {
      lines.push(`### 3.${index + 1} ${c.source.label} ⟷ ${c.target.label}`);
      lines.push(`- **Citerende sektion:** ${c.source.label} (${c.source.title || "Uden titel"})`);
      lines.push(`- **Citeret målsektion:** ${c.target.label} (${c.target.title || "Uden titel"})`);
      lines.push(`- **Modalitetsrelation:** ${c.modality}`);
      lines.push(`\n**${c.source.label} lovtekst:**`);
      lines.push(`> "${c.source.body.slice(0, 300)}..."`);
      lines.push(`\n**${c.target.label} lovtekst:**`);
      lines.push(`> "${c.target.body.slice(0, 300)}..."`);
      lines.push(`\n**Juridisk vurdering & forrang:**`);
      // Same gate as the Conflicts view in page.tsx, so the memo and the screen cannot diverge.
      const euSupremacy = euSupremacyApplies(data.docs, c.source, c.target);
      lines.push(
        euSupremacy
          ? (`Ved modstrid har EU-forordninger forrang frem for nationale bekendtgørelser (*EU-retlig forrang*). Sagsbehandlere og kontrolførere bør sikre, at nationale dispensationsbestemmelser ikke undergraver EU-harmoniserede kontrolkrav.`)
          : (`Retslig afklaring påkrævet. Der foreligger modstridende modaliteter mellem bestemmelserne, men forholdet er ikke et EU/national forrangsspørgsmål ud fra dokumentbetegnelserne. Delegerede retsakter og bekendtgørelser skal fortolkes i overensstemmelse med grundforordningens kontrolformål.`)
      );
      lines.push(`\n`);
    });
  }

  // 4. Sign-off
  lines.push(`## 4. Konklusion & Godkendelse`);
  lines.push(
    `Notatet er genereret som operationelt arbejdsgrundlag for tilsynsaktiviteter og administrativ sagsbehandling.\n`
  );
  lines.push(`_____________________________________________`);
  lines.push(`${caseworkerName}`);
  lines.push(`${departmentName}`);

  return lines.join("\n");
}
