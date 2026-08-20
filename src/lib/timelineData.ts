import { GraphData } from "./types";

export type MilestoneStatus = "in_force" | "upcoming" | "transitional";

export interface EnforcementMilestone {
  id: string;
  date: string; // ISO format: YYYY-MM-DD
  formattedDateDa: string;
  formattedDateEn: string;
  docCode: string;
  article: string;
  titleDa: string;
  titleEn: string;
  descriptionDa: string;
  descriptionEn: string;
  status: MilestoneStatus;
  affectedFleet: string;
  riskLevel: "high" | "medium" | "low";
}

export const STATUTORY_MILESTONES: EnforcementMilestone[] = [
  {
    id: "m-2024-01-10",
    date: "2024-01-10",
    formattedDateDa: "10. januar 2024",
    formattedDateEn: "10 January 2024",
    docCode: "EU 2023/2842",
    article: "Art. 130",
    titleDa: "Kontrolrevisionen trådte i kraft",
    titleEn: "Control Regulation Revision Enacted",
    descriptionDa: "EU-forordning 2023/2842 træder formelt i kraft med generelle principper og nye bemyndigelser til Kommissionen.",
    descriptionEn: "EU Regulation 2023/2842 formally entered into force establishing modernized fisheries inspection principles.",
    status: "in_force",
    affectedFleet: "Alle fartøjer",
    riskLevel: "medium",
  },
  {
    id: "m-2026-01-10-vms",
    date: "2026-01-10",
    formattedDateDa: "10. januar 2026",
    formattedDateEn: "10 January 2026",
    docCode: "EU 2023/2842",
    article: "Art. 9 (Stk. 2-4)",
    titleDa: "Obligatorisk VMS for fartøjer < 12 meter",
    titleEn: "Mandatory VMS Tracking for <12m Vessels",
    descriptionDa: "Alle fiskerfartøjer uanset størrelse skal have installeret og aktivt VMS/AIS-sporingsudstyr med automatisk positionsrapportering.",
    descriptionEn: "All fishing vessels regardless of length must be equipped with active satellite or mobile tracking devices.",
    status: "in_force",
    affectedFleet: "Fartøjer < 12 meter",
    riskLevel: "high",
  },
  {
    id: "m-2026-01-10-cctv",
    date: "2026-01-10",
    formattedDateDa: "10. januar 2026",
    formattedDateEn: "10 January 2026",
    docCode: "EU 2023/2842",
    article: "Art. 25a",
    titleDa: "Elektronisk monitorering (REM/CCTV)",
    titleEn: "Remote Electronic Monitoring (REM/CCTV)",
    descriptionDa: "Krav om kameraovervågning og sensorer om bord for fartøjer over 18 meter med høj risiko for ulovlig udsmid.",
    descriptionEn: "Mandatory on-board CCTV cameras and sensors for vessels ≥18m posing high risk of landing obligation non-compliance.",
    status: "in_force",
    affectedFleet: "Fartøjer ≥ 18 meter (Risikoflåde)",
    riskLevel: "high",
  },
  {
    id: "m-2026-07-01-weighing",
    date: "2026-07-01",
    formattedDateDa: "1. juli 2026",
    formattedDateEn: "1 July 2026",
    docCode: "BEK 1144/2025",
    article: "§ 8 - § 12",
    titleDa: "Skærpet digital vejepligt ved landing",
    titleEn: "Digital Weighing & First-Sale Reporting",
    descriptionDa: "Registrerede opkøbere og auktioner skal indberette vejedata elektronisk inden for 24 timer efter afsluttet landing.",
    descriptionEn: "Registered buyers and auction halls must transmit calibrated weighing data electronically within 24 hours.",
    status: "upcoming",
    affectedFleet: "Opkøbere & Landingssteder",
    riskLevel: "medium",
  },
  {
    id: "m-2028-01-01-elog",
    date: "2028-01-01",
    formattedDateDa: "1. januar 2028",
    formattedDateEn: "1 January 2028",
    docCode: "EU 2023/2842",
    article: "Art. 14 - 15",
    titleDa: "Fuld digital e-logbog for småfartøjer (<10m)",
    titleEn: "Full E-Logbook Mandate for Small Vessels (<10m)",
    descriptionDa: "Papirlogbøger og månedsopgørelser udfases endegyldigt. Kystfiskere skal føre fangstangivelser digitalt via app inden anløb.",
    descriptionEn: "Paper logbooks and monthly paper returns are eliminated. All vessels must submit e-logbooks prior to port arrival.",
    status: "upcoming",
    affectedFleet: "Kystflåden (< 10 meter)",
    riskLevel: "high",
  },
  {
    id: "m-2028-01-10-points",
    date: "2028-01-10",
    formattedDateDa: "10. januar 2028",
    formattedDateEn: "10 January 2028",
    docCode: "EU 2023/2842",
    article: "Art. 92 - 93",
    titleDa: "Harmoniseret pointsystem for alvorlige overtrædelser",
    titleEn: "Harmonized Sanctions & Penalty Point System",
    descriptionDa: "Automatisk tildeling af point til licenshavere og førere ved alvorlige overtrædelser med risiko for suspension af fiskeriretten.",
    descriptionEn: "Mandatory point assignment to license holders and masters for serious infringements, leading to fishing suspension.",
    status: "upcoming",
    affectedFleet: "Alle licenshavere & skippere",
    riskLevel: "high",
  },
];

/**
 * Extracts and contextualizes timeline milestones for the currently loaded GraphData.
 */
export function getTimelineForCorpus(
  data: GraphData,
  milestones: EnforcementMilestone[] = STATUTORY_MILESTONES
): EnforcementMilestone[] {
  const loadedDocCodes = data.docs.map((d) => (d.label || d.id).toLowerCase());
  
  // Filter or augment milestones based on documents loaded in session
  return milestones.filter((m) => {
    // If user loaded EU 2023/2842 or EU 1224/2009 or BEK 1144/2025, match them
    const isDocLoaded = loadedDocCodes.some((code) => {
      if (m.docCode.toLowerCase().includes("2842") && code.includes("2842")) return true;
      if (m.docCode.toLowerCase().includes("1144") && code.includes("1144")) return true;
      if (m.docCode.toLowerCase().includes("1197") && code.includes("1197")) return true;
      if (m.docCode.toLowerCase().includes("1224") && code.includes("1224")) return true;
      return false;
    });

    // If matches loaded docs, keep it. If no specific match, show all generic fisheries milestones.
    return loadedDocCodes.length === 0 || isDocLoaded || loadedDocCodes.some(c => c.includes("eu") || c.includes("bek"));
  });
}
