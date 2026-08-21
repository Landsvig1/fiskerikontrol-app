import { GraphNode, GraphLink, ConflictRecord, DocRef } from "./types";
import { docLabel } from "./docDisplay";
import { formatConflictDescription, themeLabel } from "./labels";

export interface ConnectionExplanation {
  headline: string;
  summary: string;
  legalRole: string;
  hierarchyContext: string;
  snippet?: string;
  hasConflict: boolean;
  conflictDescription?: string;
}

/**
 * Analyzes the directional link and modalities between two provisions to produce a clear
 * explanation of how they are legally and functionally connected.
 */
export function explainConnection(
  selectedNode: GraphNode,
  otherNode: GraphNode,
  link: GraphLink,
  isOutgoing: boolean,
  conflicts: ConflictRecord[] = [],
  docs: DocRef[] = [],
  lang: "da" | "en" = "da"
): ConnectionExplanation {
  const selectedDocTitle = docLabel(docs, selectedNode.doc, (k) => k);
  const otherDocTitle = docLabel(docs, otherNode.doc, (k) => k);

  const isEuSelected = selectedNode.doc.toLowerCase().includes("eu") || selectedNode.label.toLowerCase().includes("eu");
  const isEuOther = otherNode.doc.toLowerCase().includes("eu") || otherNode.label.toLowerCase().includes("eu");

  // Check if there is an active recorded conflict between these two specific provisions
  const relevantConflict = conflicts.find((c) => {
    const targetsSelected = c.target === selectedNode.id || c.target === selectedNode.label;
    const targetsOther = c.target === otherNode.id || c.target === otherNode.label;
    const sourcesContainSelected = c.citations.some(
      (cit) => cit.source === selectedNode.id || cit.source === selectedNode.label
    );
    const sourcesContainOther = c.citations.some(
      (cit) => cit.source === otherNode.id || cit.source === otherNode.label
    );
    return (targetsSelected && sourcesContainOther) || (targetsOther && sourcesContainSelected);
  });

  const modality = (link.modality || "Direct").toLowerCase();

  let headline = "";
  let summary = "";
  let legalRole = "";

  if (lang === "da") {
    const targetTheme = otherNode.theme ? themeLabel(otherNode.theme, "da") : "";
    const themeNote = targetTheme ? ` (vedr. ${targetTheme.toLowerCase()})` : "";
    if (isOutgoing) {
      switch (modality) {
        case "exception":
          headline = `${selectedNode.label} fraviger kravene i ${otherNode.label}`;
          summary = `Bestemmelsen i ${selectedNode.label} (${selectedDocTitle}) udgør en specifik undtagelse eller lempelse fra hovedreglen fastsat i ${otherNode.label}${themeNote}.`;
          legalRole = `Undtagelsesbestemmelse (Fravigelse af almindelig kontrolforpligtelse).`;
          break;
        case "authorization":
          headline = `${selectedNode.label} har hjemmel i ${otherNode.label}`;
          summary = `Bestemmelsen i ${selectedNode.label} (${selectedDocTitle}) udmønter den lovgivningsmæssige bemyndigelse (retslige hjemmel), der er tildelt i ${otherNode.label}.`;
          legalRole = `Bemyndigelsesudmøntning (Delegeret retsakt / administrativ forskrift).`;
          break;
        case "enforcement":
          headline = `${selectedNode.label} håndhæver / sanktionerer ${otherNode.label}`;
          summary = `Bestemmelsen i ${selectedNode.label} etablerer kontrolforanstaltninger, administrative sanktioner eller strafferetligt ansvar ved manglende overholdelse af ${otherNode.label}.`;
          legalRole = `Håndhævelses- og kontrolbestemmelse.`;
          break;
        case "scope":
          headline = `${selectedNode.label} afgrænser anvendelsesområde via ${otherNode.label}`;
          summary = `Bestemmelsen definerer hvilke fartøjer, redskaber eller farvande der er omfattet af reguleringen ved direkte henvisning til afgrænsningen i ${otherNode.label}.`;
          legalRole = `Afgrænsnings- og gyldighedsområde.`;
          break;
        case "definition":
          headline = `${selectedNode.label} anvender definitioner fra ${otherNode.label}`;
          summary = `Termer og begreber i ${selectedNode.label} fortolkes og anvendes i overensstemmelse med de legale definitioner fastlagt i ${otherNode.label}.`;
          legalRole = `Legal definition og begrebsapparat.`;
          break;
        case "direct":
        default:
          headline = `${selectedNode.label} henviser direkte til ${otherNode.label}`;
          summary = `Bestemmelsen i ${selectedNode.label} (${selectedDocTitle}) forpligter adressaten til at overholde og gennemføre de procedurer, der er fastlagt i ${otherNode.label} (${otherDocTitle}).`;
          legalRole = `Direkte materiel henvisning (Forpligtende reference).`;
          break;
      }
    } else {
      // Incoming citation
      switch (modality) {
        case "exception":
          headline = `${otherNode.label} fraviger kravene i ${selectedNode.label}`;
          summary = `${otherNode.label} (${otherDocTitle}) indeholder en undtagelse eller særregel, der begrænser anvendelsen af den valgte bestemmelse (${selectedNode.label}).`;
          legalRole = `Modtagende bestemmelse er underlagt undtagelse i den forbundne retsakt.`;
          break;
        case "authorization":
          headline = `${otherNode.label} udmønter bemyndigelse fra ${selectedNode.label}`;
          summary = `${otherNode.label} er udstedt med hjemmel i beføjelserne fastsat i den valgte bestemmelse (${selectedNode.label}).`;
          legalRole = `Den valgte bestemmelse udgør retsgrundlag/hjemmel for den forbundne regel.`;
          break;
        case "enforcement":
          headline = `${otherNode.label} sanktionerer overtrædelser af ${selectedNode.label}`;
          summary = `${otherNode.label} fastsætter kontrol- og straffebestemmelser for overtrædelse af forpligtelserne i ${selectedNode.label}.`;
          legalRole = `Den valgte bestemmelse håndhæves via den forbundne kontrolregel.`;
          break;
        case "direct":
        default:
          headline = `${otherNode.label} henviser til ${selectedNode.label}`;
          summary = `${otherNode.label} (${otherDocTitle}) bygger direkte på og forudsætter efterlevelse af den valgte bestemmelse (${selectedNode.label}).`;
          legalRole = `Indgående reference (Den valgte bestemmelse er retsligt grundlag).`;
          break;
      }
    }
  } else {
    // English
    if (isOutgoing) {
      headline = `${selectedNode.label} references ${otherNode.label}`;
      summary = `Provision ${selectedNode.label} in ${selectedDocTitle} connects directly to ${otherNode.label} (${otherDocTitle}) under modality "${link.modality}".`;
      legalRole = `Outgoing reference (${link.modality}).`;
    } else {
      headline = `${otherNode.label} references ${selectedNode.label}`;
      summary = `Provision ${otherNode.label} in ${otherDocTitle} references ${selectedNode.label} as a prerequisite standard.`;
      legalRole = `Incoming citation (${link.modality}).`;
    }
  }

  // Determine hierarchy context
  let hierarchyContext = "";
  if (lang === "da") {
    if (isEuSelected && !isEuOther) {
      hierarchyContext = `EU-forordningen (${selectedNode.label}) er direkte bindende og har forrang for den nationale bekendtgørelse (${otherNode.label}).`;
    } else if (!isEuSelected && isEuOther) {
      hierarchyContext = `Den nationale bekendtgørelse (${selectedNode.label}) skal administreres i overensstemmelse med den overordnede EU-forordning (${otherNode.label}).`;
    } else if (isEuSelected && isEuOther) {
      hierarchyContext = `Forbindelse mellem EU-retsakter inden for det fælles europæiske fiskerikontrolsystem.`;
    } else {
      hierarchyContext = `National retskildeforbindelse mellem danske bekendtgørelser og fiskerilovgivning.`;
    }
  } else {
    if (isEuSelected !== isEuOther) {
      hierarchyContext = `Cross-jurisdictional interaction between EU Regulation and Danish National Fisheries Order.`;
    } else {
      hierarchyContext = `Regulatory link within the same legislative jurisdiction.`;
    }
  }

  const conflictDescription = relevantConflict
    ? formatConflictDescription(relevantConflict.description, otherNode.label, lang)
    : undefined;

  return {
    headline,
    summary,
    legalRole,
    hierarchyContext,
    snippet: link.snippet || link.context,
    hasConflict: Boolean(relevantConflict),
    conflictDescription,
  };
}
