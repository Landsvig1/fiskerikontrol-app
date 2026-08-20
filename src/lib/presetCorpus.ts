export interface PresetDoc {
  id: string;
  filename: string;
  code: string;
  titleDa: string;
  titleEn: string;
  type: "eu" | "bek" | "lov";
  typeLabelDa: string;
  typeLabelEn: string;
  descriptionDa: string;
  descriptionEn: string;
  path: string;
  defaultSelected?: boolean;
}

export const PRESET_DOCUMENTS: PresetDoc[] = [
  {
    id: "eu-2023-2842",
    filename: "eu-2023-2842-kontrolrevision.pdf",
    code: "EU 2023/2842",
    titleDa: "Kontrolforordningen (Revision)",
    titleEn: "Fisheries Control Regulation (Revision)",
    type: "eu",
    typeLabelDa: "EU Forordning",
    typeLabelEn: "EU Regulation",
    descriptionDa: "EU-hovedforordning for fiskerikontrol, elektronisk logbog, VMS, sporbarhed og sanktioner.",
    descriptionEn: "Core EU regulation for fisheries control, e-logbook, VMS, traceability, and sanctions.",
    path: "/corpus/eu-2023-2842-kontrolrevision.pdf",
    defaultSelected: true,
  },
  {
    id: "bek-1197-2025",
    filename: "bek-1197-2025-logbog.pdf",
    code: "BEK 1197/2025",
    titleDa: "Logbogbekendtgørelsen",
    titleEn: "Logbook Executive Order",
    type: "bek",
    typeLabelDa: "Dansk Bekendtgørelse",
    typeLabelEn: "Danish Executive Order",
    descriptionDa: "Nationale regler om føring og aflevering af logbøger, kystfiskeri og undtagelser.",
    descriptionEn: "National rules on logging, submission of fishing trip logbooks, and coastal exemptions.",
    path: "/corpus/bek-1197-2025-logbog.pdf",
    defaultSelected: true,
  },
  {
    id: "bek-1144-2025",
    filename: "bek-1144-2025-landingskontrol.pdf",
    code: "BEK 1144/2025",
    titleDa: "Registrering & Landingskontrol",
    titleEn: "Registration & Landing Control",
    type: "bek",
    typeLabelDa: "Dansk Bekendtgørelse",
    typeLabelEn: "Danish Executive Order",
    descriptionDa: "Regler for førsteomsætning, kontrol med landet fisk, vejepligt og salgsnotater.",
    descriptionEn: "Rules on first-hand sales, landing inspections, weighing duties, and sales notes.",
    path: "/corpus/bek-1144-2025-landingskontrol.pdf",
  },
  {
    id: "lbk-205-2023",
    filename: "lbk-205-2023-fiskeriloven.pdf",
    code: "LBK 205/2023",
    titleDa: "Fiskeriloven",
    titleEn: "Fisheries Act",
    type: "lov",
    typeLabelDa: "Dansk Lov",
    typeLabelEn: "Danish Act",
    descriptionDa: "Hovedloven om erhvervs- og lystfiskeri i Danmark samt bemyndigelser til kontrol.",
    descriptionEn: "Primary Danish statute governing commercial and recreational fisheries control.",
    path: "/corpus/lbk-205-2023-fiskeriloven.pdf",
  },
];

/**
 * Fetches the binary PDF files for the given preset document IDs and converts them into File objects.
 */
export async function fetchPresetFiles(
  presetIds: string[],
  fetchFn: typeof fetch = fetch
): Promise<Array<{ file: File; label: string }>> {
  const selectedPresets = PRESET_DOCUMENTS.filter((doc) => presetIds.includes(doc.id));
  
  const results = await Promise.all(
    selectedPresets.map(async (doc) => {
      const response = await fetchFn(doc.path);
      if (!response.ok) {
        throw new Error(`Failed to load preset document: ${doc.filename} (HTTP ${response.status})`);
      }
      const blob = await response.blob();
      const file = new File([blob], doc.filename, { type: "application/pdf" });
      return {
        file,
        label: doc.code,
      };
    })
  );

  return results;
}
