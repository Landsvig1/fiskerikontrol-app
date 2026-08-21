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
 * Pulls the identifying act numbers out of a document code or label.
 *
 * Four-digit values inside 1900-2100 are dropped as years, so "EU 2023/2842" identifies on
 * "2842" and "BEK 1144/2025" on "1144". Without that, every 2025 bekendtgørelse would match
 * every other one.
 */
function actNumbers(code: string): string[] {
  const tokens = code.match(/\d{3,4}/g) ?? [];
  return tokens.filter((token) => {
    const n = Number(token);
    return !(n >= 1900 && n <= 2100);
  });
}

/**
 * Extracts and contextualizes timeline milestones for the currently loaded GraphData.
 *
 * A milestone is kept only when the act it stems from is actually part of the loaded corpus.
 * Showing a BEK 1144/2025 deadline for a corpus that does not contain BEK 1144/2025 would
 * present an obligation the caseworker has no source document for.
 */
export function getTimelineForCorpus(
  data: GraphData,
  milestones: EnforcementMilestone[] = STATUTORY_MILESTONES
): EnforcementMilestone[] {
  const loadedLabels = data.docs.map((d) => (d.label || d.id).toLowerCase());

  // Nothing loaded yet: show the full statutory calendar rather than an empty timeline.
  if (loadedLabels.length === 0) return milestones;

  return milestones.filter((m) => {
    const code = m.docCode.toLowerCase();
    const numbers = actNumbers(code);

    return loadedLabels.some((label) => {
      if (label.includes(code)) return true;
      return numbers.some((n) => actNumbers(label).includes(n));
    });
  });
}
