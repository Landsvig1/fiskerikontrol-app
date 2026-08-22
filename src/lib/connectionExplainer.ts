import { GraphNode, GraphLink, ConflictRecord, DocRef } from "./types";
import { docLabel } from "./docDisplay";
import { formatConflictDescription, themeLabel } from "./labels";
import { nodeJurisdiction } from "./jurisdiction";
import { findConflictBetween } from "./nodeConnections";

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
  docs: DocRef[] = []
): ConnectionExplanation {
  const selectedDocTitle = docLabel(docs, selectedNode.doc, (k) => k);
  const otherDocTitle = docLabel(docs, otherNode.doc, (k) => k);

  // Kept as the three-valued Jurisdiction, not a boolean. Collapsing "unknown" into "not eu"
  // makes the explainer assert that an unclassifiable document is Danish national law.
  const jurSelected = nodeJurisdiction(docs, selectedNode);
  const jurOther = nodeJurisdiction(docs, otherNode);
  const isEuSelected = jurSelected === "eu";
  const isEuOther = jurOther === "eu";
  const jurisdictionUnknown = jurSelected === "unknown" || jurOther === "unknown";

  // Check if there is an active recorded conflict between these two specific provisions.
  // Same rule the drawer uses to file a connection under its conflict group.
  const relevantConflict = findConflictBetween(conflicts, selectedNode, otherNode);

  const modality = (link.modality || "Direct").toLowerCase();

  let headline = "";
  let summary = "";
  let legalRole = "";

  const targetTheme = otherNode.theme ? themeLabel(otherNode.theme) : "";
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
      case "prohibition":
        headline = `${selectedNode.label} forbyder forhold reguleret i ${otherNode.label}`;
        summary = `Bestemmelsen i ${selectedNode.label} (${selectedDocTitle}) opstiller et forbud, der begrænser de handlinger eller aktiviteter, som ${otherNode.label} omhandler${themeNote}.`;
        legalRole = `Forbudsbestemmelse (Negativ handlepligt).`;
        break;
      case "permission":
        headline = `${selectedNode.label} giver adgang eller hjemmel efter ${otherNode.label}`;
        summary = `Bestemmelsen i ${selectedNode.label} (${selectedDocTitle}) tillader en handling eller tildeler en beføjelse inden for rammerne af ${otherNode.label}${themeNote}.`;
        legalRole = `Tilladelses- og hjemmelsbestemmelse (Fakultativ adgang).`;
        break;
      case "obligation":
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
      case "prohibition":
        headline = `${otherNode.label} forbyder forhold reguleret i ${selectedNode.label}`;
        summary = `${otherNode.label} (${otherDocTitle}) opstiller et forbud, der begrænser rækkevidden af den valgte bestemmelse (${selectedNode.label}).`;
        legalRole = `Den valgte bestemmelse er indskrænket af et forbud i den forbundne retsakt.`;
        break;
      case "permission":
        headline = `${otherNode.label} tillader fravigelse af ${selectedNode.label}`;
        summary = `${otherNode.label} (${otherDocTitle}) giver adgang til en handling eller beføjelse med udgangspunkt i den valgte bestemmelse (${selectedNode.label}).`;
        legalRole = `Den valgte bestemmelse udgør rammen for en fakultativ adgang i den forbundne regel.`;
        break;
      case "obligation":
      case "direct":
      default:
        headline = `${otherNode.label} henviser til ${selectedNode.label}`;
        summary = `${otherNode.label} (${otherDocTitle}) bygger direkte på og forudsætter efterlevelse af den valgte bestemmelse (${selectedNode.label}).`;
        legalRole = `Indgående reference (Den valgte bestemmelse er retsligt grundlag).`;
        break;
    }
  }

  // Determine hierarchy context
  let hierarchyContext = "";
  if (jurisdictionUnknown) {
    hierarchyContext = `Retskildehierarkiet kan ikke afgøres ud fra dokumentbetegnelserne.`;
  } else {
    if (isEuSelected && !isEuOther) {
      hierarchyContext = `EU-forordningen (${selectedNode.label}) er direkte bindende og har forrang for den nationale bekendtgørelse (${otherNode.label}).`;
    } else if (!isEuSelected && isEuOther) {
      hierarchyContext = `Den nationale bekendtgørelse (${selectedNode.label}) skal administreres i overensstemmelse med den overordnede EU-forordning (${otherNode.label}).`;
    } else if (isEuSelected && isEuOther) {
      hierarchyContext = `Forbindelse mellem EU-retsakter inden for det fælles europæiske fiskerikontrolsystem.`;
    } else {
      hierarchyContext = `National retskildeforbindelse mellem danske bekendtgørelser og fiskerilovgivning.`;
    }
  }

  const conflictDescription = relevantConflict
    ? formatConflictDescription(relevantConflict.description, otherNode.label)
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
