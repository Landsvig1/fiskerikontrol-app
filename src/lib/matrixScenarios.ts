/**
 * Fiskeriets Matrix: Forvaltnings-Scenarier (Persona & Kæde-Flows)
 *
 * Pre-configured regulatory walkthroughs tailored for caseworkers,
 * maritime inspectors, and IT architects in the Danish Fisheries Agency.
 */

export interface MatrixScenario {
  id: string;
  titleDa: string;
  badgeDa: string;
  focusNodeId: string;
  year: 2026 | 2028;
  narrativeDa: string;
  descriptionDa: string;
  icon: string;
}

export const MATRIX_SCENARIOS: MatrixScenario[] = [
  {
    id: "coastal_micro",
    titleDa: "Mikro-kystfisker (<8m joller)",
    badgeDa: "Undtagelser & 2028 Chok",
    focusNodeId: "actor_micro",
    year: 2026,
    narrativeDa: "Småfartøj <8m ➔ Første salg ➔ Salgsnota i FOS ➔ BEK 1144 & Art. 62",
    descriptionDa: "Små kystfartøjer er i 2026 undtaget fra elektronisk logbog (eLog), forhåndsanmeldelse (PNO) og VMS-sporing. Myndighedens data opsamles først 48 timer efter landing via opkøbers afregningsseddel. Fra 10. januar 2028 træder EU 2023/2842 i kraft med obligatorisk mobil-sporing og eLog for samtlige fartøjer.",
    icon: "Anchor",
  },
  {
    id: "medium_trawler",
    titleDa: "Konsumkutter (12–18m)",
    badgeDa: "Klassisk Konsumfiskeri",
    focusNodeId: "actor_medium",
    year: 2026,
    narrativeDa: "Afsejling (VMS) ➔ Fangst (eLog) ➔ PNO 4t ➔ Vejning (10% margin) ➔ Krydskontrol",
    descriptionDa: "Rygraden i dansk konsumfiskeri. Underlagt fuld digital kontrolkæde: automatisk VMS-satellitpositionering, halingsvis eLog-registrering, 4-timers forudgående anmeldelse før anløb, samt skarp kontrol mod 10 % tolerancemargen ved landing.",
    icon: "Ship",
  },
  {
    id: "pelagic_cctv",
    titleDa: "Pelagisk Trawler (>18m)",
    badgeDa: "CCTV & Højrisiko",
    focusNodeId: "actor_large",
    year: 2028,
    narrativeDa: "Kontinuerlig VMS ➔ CCTV-kameraovervågning ➔ Kontinuerlig maskineffekt ➔ Art. 13",
    descriptionDa: "Store havgående trawlere med høj fangstkapacitet. Fra 2028 omfattet af lovpligtig elektronisk fjernovervågning (REM/CCTV) til kontrol af landingsforpligtelsen, kontinuerlig datalogning af motorkraft og skærpet industrivejning.",
    icon: "Camera",
  },
  {
    id: "weighing_reform",
    titleDa: "Vejereform (10. jan 2026)",
    badgeDa: "Autoriseret Vejning",
    focusNodeId: "actor_weighing",
    year: 2026,
    narrativeDa: "Autoriseret Vejer ➔ Vejning v. Landing ➔ FOS Salgsdatabase ➔ Art. 60 & BEK 1144",
    descriptionDa: "Pr. 10. januar 2026 gælder et nyt tilladelseskrav: Kun forhåndsgodkendte vejeoperatører må veje fiskevarer ved landing. Vejeresultatet overføres direkte til Fiskeristyrelsens systemer og udgør det juridiske referencepunkt for skippers estimater.",
    icon: "Scale",
  },
  {
    id: "crosscheck_inspection",
    titleDa: "Automatiseret Krydskontrol",
    badgeDa: "Data-Audit & Point",
    focusNodeId: "evt_crosscheck",
    year: 2026,
    narrativeDa: "Valideringsmotor ➔ eLog vs. VMS vs. Salgsnota ➔ Art. 49-53 ➔ Pointtildeling (Art. 92)",
    descriptionDa: "Fiskeristyrelsens automatiske valideringsmotor sammenholder skippers eLog-halinger, FMC's satellitspor og auktionens vejede salgsnota. Registreres uoverensstemmelser over 10 %, genereres der automatisk tilsynssag og pointtildeling efter BEK 978.",
    icon: "Cpu",
  },
  {
    id: "transformation_2028",
    titleDa: "Det Store 2028 Skifte",
    badgeDa: "Målarkitektur",
    focusNodeId: "reg_2023_2842",
    year: 2028,
    narrativeDa: "EU 2023/2842 ➔ Obligatorisk e-Tracking <12m ➔ Lovpligtig CCTV ➔ Art. 109 Motor",
    descriptionDa: "Slutfasen for EU's nye kontrolpakke: Overgangsregler for småbåde bortfalder fuldstændigt, mobil-VMS bliver obligatorisk for alle småfartøjer, og kameraovervågning udrulles for risikoklasser.",
    icon: "Sparkles",
  },
];
