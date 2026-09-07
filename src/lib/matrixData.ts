/**
 * Fiskeriets Matrix: 360° Krydsfelts-Explorer Data & Relations
 *
 * Models the multi-dimensional relationships across:
 * 1. Aktører & Fartøjsklasser (Hvem)
 * 2. Operationelle Hændelser (Hvad)
 * 3. IT-Systemer & Datastrømme (Hvor)
 * 4. Regelsæt & Retskilder (Hvorfor / Hjemmel)
 *
 * Includes the temporal dimension: 2026 (i dag) vs. 2028 (fuld EU-indfasning).
 */

export type MatrixColumn = 'actors' | 'events' | 'systems' | 'regulations';
export type TimelineYear = 2026 | 2028;

export interface MatrixNode {
  id: string;
  column: MatrixColumn;
  titleDa: string;
  subtitleDa?: string;
  category: string;
  descriptionDa: string;
  introducedYear?: TimelineYear;
  legalReference?: string;
  feltkatalogRefs?: string[];
  icon?: string;
}

export interface MatrixEdge {
  sourceId: string;
  targetId: string;
  yearValidFrom: TimelineYear;
  roleDa: string;
  noteDa?: string;
}

export const MATRIX_COLUMNS: { id: MatrixColumn; titleDa: string; descriptionDa: string }[] = [
  {
    id: 'actors',
    titleDa: '1. Aktør / Fartøjsklasse',
    descriptionDa: 'Hvem bærer pligten eller udfører tilsynet',
  },
  {
    id: 'events',
    titleDa: '2. Operationel Hændelse',
    descriptionDa: 'Hvad der sker i den fysiske og administrative livscyklus',
  },
  {
    id: 'systems',
    titleDa: '3. IT-System & Datastrøm',
    descriptionDa: 'Hvor data registreres, transmitteres og valideres',
  },
  {
    id: 'regulations',
    titleDa: '4. Regelsæt & Hjemmel',
    descriptionDa: 'Hvorfor kravet eksisterer i EU- og dansk lovgivning',
  },
];

export const MATRIX_NODES: MatrixNode[] = [
  // --- COLUMN 1: AKTØRER ---
  {
    id: 'actor_micro',
    column: 'actors',
    titleDa: 'Fartøj < 8m (Mikro-kystfisker)',
    subtitleDa: 'Fritids- og bierhverv / småjoller',
    category: 'Fartøj',
    descriptionDa: 'Mindre kystfartøjer traditionelt undtaget fra eLog og VMS. Fra 2028 underlagt obligatorisk elektronisk positionssporing via mobilapp og digital fangstrapportering jf. art. 15a.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 15a (som ændret ved 2023/2842)',
    feltkatalogRefs: ['Bilag XV felt 1-44'],
  },
  {
    id: 'actor_coastal',
    column: 'actors',
    titleDa: 'Fartøj 8–12m (Kystfisker)',
    subtitleDa: 'Kystfiskerordningen / MAF',
    category: 'Fartøj',
    descriptionDa: 'Garn- og linebåde i kystnært fiskeri. Frem til 10. januar 2028 gælder overgangsregler efter 404/2011, hvorefter mobil VMS og digital eLog bliver obligatorisk uden undtagelser.',
    introducedYear: 2026,
    legalReference: 'BEK 1197/2025; 2025/2196 art. 81',
    feltkatalogRefs: ['Bilag XV'],
  },
  {
    id: 'actor_medium',
    column: 'actors',
    titleDa: 'Fartøj 12–18m (Konsumfartøj)',
    subtitleDa: 'Kuttere og mellemstore trawlere',
    category: 'Fartøj',
    descriptionDa: 'Fuldt omfattet af EU-kontrolpakken i dag. Skal føre elektronisk logbog (eLog), sende VMS hvert 10.-30. minut, afgive PNO 4 timer før anløb og overholde 10 % tolerancemargen.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 9, 14, 17',
    feltkatalogRefs: ['Bilag VI', 'Bilag XV felt 1-44'],
  },
  {
    id: 'actor_large',
    column: 'actors',
    titleDa: 'Fartøj > 18m / 24m (Industri & Pelagisk)',
    subtitleDa: 'Store trawlere og notfartøjer',
    category: 'Fartøj',
    descriptionDa: 'Store fartøjer med høj fangstkapacitet. Fra 2028 omfattet af obligatorisk elektronisk fjernovervågning (CCTV) for risikofartøjer, kontinuerlig maskineffekt-overvågning og skærpet landingskontrol.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 13 (2028), art. 39a',
    feltkatalogRefs: ['Bilag VI', 'Bilag XV', 'Bilag XIX'],
  },
  {
    id: 'actor_buyer',
    column: 'actors',
    titleDa: 'Førstegangsmodtager (Opkøber/Auktion)',
    subtitleDa: 'Fiskeauktioner og registrerede købere',
    category: 'Omsætning',
    descriptionDa: 'Køber fangst direkte fra fiskeren. Ansvarlig for elektronisk indberetning af salgsnota inden 48 timer efter første salg, herunder tilknytning af det unikke fangstrejse-ID.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 62-65; BEK 1144/2025',
    feltkatalogRefs: ['Bilag XIX (26 felter)'],
  },
  {
    id: 'actor_weighing',
    column: 'actors',
    titleDa: 'Autoriseret Vejeoperatør',
    subtitleDa: 'Godkendte vejeaktører',
    category: 'Vejning',
    descriptionDa: 'Nyt tilladelseskrav indført pr. 10. januar 2026: Enhver der vejer fiskevarer ved landing skal være forhåndsgodkendt af styrelsen og benytte godkendte, plomberede vægte.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 60; BEK 1144/2025',
    feltkatalogRefs: ['Bilag XIX felt 10'],
  },
  {
    id: 'actor_transporter',
    column: 'actors',
    titleDa: 'Transportør',
    subtitleDa: 'Kølebiler og fragtfirmaer',
    category: 'Transport',
    descriptionDa: 'Transporterer uforarbejdede fiskevarer. Fra 2026 forpligtet til at have elektronisk transportdokument indsendt før transporten påbegyndes, indeholdende sporbarhedskoder.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 68; (EU) 2025/2196 art. 63',
    feltkatalogRefs: ['Bilag XIX felt 1-26'],
  },
  {
    id: 'actor_agency',
    column: 'actors',
    titleDa: 'Fiskeristyrelsen (Kontrol & FMC)',
    subtitleDa: 'Døgnvagt, søtilsyn og kajkontrollører',
    category: 'Myndighed',
    descriptionDa: 'Håndhævende myndighed under Styrelsen for Fødevarer, Landbrug og Fiskeri. Opererer kontrolskibene Havørnen og Vestkysten, FMC-døgnvagt og lokale havnekontrollører.',
    introducedYear: 2026,
    legalReference: 'Fiskeriloven LBK 205/2023 § 117-122',
  },

  // --- COLUMN 2: HÆNDELSER ---
  {
    id: 'evt_license',
    column: 'events',
    titleDa: 'Fiskeriadgang & Kvotetildeling',
    subtitleDa: 'Licenser, FKA/IOK andele',
    category: 'Adgang',
    descriptionDa: 'Fartøjets registrering i flåderegistret og tildeling af årlige fiskerimuligheder og kvoter forud for sejlads.',
    legalReference: '1224/2009 art. 6-7; BEK 1571/2025',
  },
  {
    id: 'evt_departure',
    column: 'events',
    titleDa: 'Udsejling & Positionsovervågning',
    subtitleDa: 'VMS / FOS tracking',
    category: 'Sejlads',
    descriptionDa: 'Fartøjet forlader havn. Satellit- og mobilsporing overvåger kurs, fart og zoner. I og nær begrænsede områder transmitteres position hvert 30. minut.',
    legalReference: '1224/2009 art. 9; 2025/2196 art. 19-23',
    feltkatalogRefs: ['Bilag VI'],
  },
  {
    id: 'evt_catch',
    column: 'events',
    titleDa: 'Fangst & eLog Dæksregistrering',
    subtitleDa: 'Halinger og skønnede vægte',
    category: 'Fiskeri',
    descriptionDa: 'Udførelse af fiskeoperation (træk/haling). Registrering af redskab, position (ICES-felt), estimeret fangst i kg pr. art og eventuelt udsmid jf. landingsforpligtelsen.',
    legalReference: '1224/2009 art. 14; BEK 1197/2025 § 4-6',
    feltkatalogRefs: ['Bilag XV række 1-44'],
  },
  {
    id: 'evt_sea_inspect',
    column: 'events',
    titleDa: 'Søkontrol (Kontrol 1)',
    subtitleDa: 'Fysisk bording til søs',
    category: 'Tilsyn',
    descriptionDa: 'Kontrolskibet border fartøjet til søs. Måling af masker med elektronisk OMEGA-måler, tjek af selektionspaneler, dækslog og CCTV. Udfærdigelse af elektronisk inspektionsrapport (EIR).',
    legalReference: '1224/2009 art. 71-77; 2019/1241 art. 6',
  },
  {
    id: 'evt_pno',
    column: 'events',
    titleDa: 'Forhåndsmeddelelse (PNO)',
    subtitleDa: '4-timers anløbsvarsel til FMC',
    category: 'Varsling',
    descriptionDa: 'Skibsføreren indsender anløbsvarsel til FMC senest 4 timer før forventet ankomst (ETA). Angiver anløbshavn, tidspunkt og estimeret ombordværende fangst pr. art.',
    legalReference: '1224/2009 art. 17; 2025/2196 Bilag XV',
    feltkatalogRefs: ['Bilag XV række 1-22'],
  },
  {
    id: 'evt_landing',
    column: 'events',
    titleDa: 'Landing & Losning',
    subtitleDa: 'Ankomst og ilandbringelse',
    category: 'Havn',
    descriptionDa: 'Fartøjet anløber havn, fortøjer og påbegynder losning. Aflevering af elektronisk landingserklæring med tidsstempler for landingens start og afslutning.',
    legalReference: '1224/2009 art. 23-24; BEK 1144/2025 § 8',
    feltkatalogRefs: ['Bilag XV række 24-34'],
  },
  {
    id: 'evt_quay_inspect',
    column: 'events',
    titleDa: 'Landingskontrol (Kontrol 2)',
    subtitleDa: 'Kajkontrol og kontrolvejning',
    category: 'Tilsyn',
    descriptionDa: 'Fiskerikontrollører inspicerer losningen på kajen. Kontrolvejning af kasser, sorteringskontrol og beregning af 10 % tolerancemargen mod eLog-estimatet.',
    legalReference: '1224/2009 art. 78-88; BEK 1144/2025',
  },
  {
    id: 'evt_weighing',
    column: 'events',
    titleDa: 'Vejning ved Landing',
    subtitleDa: 'Autoriseret vejeoperatør',
    category: 'Vejning',
    descriptionDa: 'Al fangst vejes pr. art af en godkendt vejeoperatør på godkendt vægt forud for opdeling, oplagring eller salg. Danner grundlag for afregning og kvotetræk.',
    legalReference: '1224/2009 art. 60-61; BEK 1144/2025 § 14',
    feltkatalogRefs: ['Bilag XIX felt 10'],
  },
  {
    id: 'evt_first_sale',
    column: 'events',
    titleDa: 'Førstegangssalg & Afregning',
    subtitleDa: 'Salgsnota i FOS inden 48t',
    category: 'Handel',
    descriptionDa: 'Første omsætningsled. Auktion eller opkøber udsteder elektronisk salgsnota inden 48 timer med priser, arter, nettokilo og unikt fangstrejse-ID.',
    legalReference: '1224/2009 art. 62-65; BEK 1144/2025 § 19',
    feltkatalogRefs: ['Bilag XIX (26 felter)'],
  },
  {
    id: 'evt_transport',
    column: 'events',
    titleDa: 'Transport & Partisporbarhed',
    subtitleDa: 'Transportdokument før afgang',
    category: 'Logistik',
    descriptionDa: 'Fangst transporteres videre. Transportdokumentet skal indsendes digitalt inden transporten påbegyndes, og partierne skal have entydige identifikationsnumre.',
    legalReference: '1224/2009 art. 58, 68; 2025/2196 art. 63',
    feltkatalogRefs: ['Bilag XIX felt 1-26'],
  },
  {
    id: 'evt_crosscheck',
    column: 'events',
    titleDa: 'Krydskontrol & Point (Kontrol 3)',
    subtitleDa: 'Art. 109 datavalidering & sanktion',
    category: 'Sanktion',
    descriptionDa: 'Automatiseret krydstjek mellem VMS, eLog, PNO, landing og salg. Afvigelser ud over tolerance eller tidsfrister udløser audit notater og 3-7 strafpoint jf. art. 92.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 90-92, 109; 2025/2196 art. 49-53',
    feltkatalogRefs: ['Bilag XVIII'],
  },

  // --- COLUMN 3: IT-SYSTEMER ---
  {
    id: 'sys_elog',
    column: 'systems',
    titleDa: 'eLog / ERS',
    subtitleDa: 'Elektronisk Fiskerilogbog',
    category: 'Fangst-IT',
    descriptionDa: 'Det centrale indberetningssystem til fiskerilogbøger, forhåndsmeddelelser og landingserklæringer. Fra 2028 udvides systemet til samtlige fartøjer under 12 meter.',
    legalReference: '1224/2009 art. 14, 15a; 2025/2196 Bilag XV',
    feltkatalogRefs: ['Bilag XV (44 felter)'],
  },
  {
    id: 'sys_fos_vms',
    column: 'systems',
    titleDa: 'FOS Fartøjsovervågning (VMS)',
    subtitleDa: 'Satellit- og mobilsporing',
    category: 'Overvågning',
    descriptionDa: 'Modtager automatisk positionsdata fra fartøjernes transpondere eller mobilapps. Håndterer geofencing af lukkede zoner og sender data til FMC.',
    legalReference: '1224/2009 art. 9; 2025/2196 art. 19',
    feltkatalogRefs: ['Bilag VI'],
  },
  {
    id: 'sys_fmc',
    column: 'systems',
    titleDa: 'FMC Døgnvagt (Operationssystem)',
    subtitleDa: 'FiskeriMoniteringsCenteret',
    category: 'Operationsrum',
    descriptionDa: 'Styrelsens 24/7 overvågningscenter. Modtager PNO-varsler, overvåger VMS-alarmer (fartøjer i lukkede zoner) og koordinerer kontrolskibe og havnevagter.',
    legalReference: '1224/2009 art. 9a; 2025/1766 art. 9a',
  },
  {
    id: 'sys_fos_sales',
    column: 'systems',
    titleDa: 'FOS Afregning & Kvoter',
    subtitleDa: 'Fiskeriets Omsætningssystem',
    category: 'Afregning',
    descriptionDa: 'Styrelsens fagsystem for modtagelse af salgsnotaer, afskrivning på nationale kvoter og FKA/IOK årsmængder samt validering af registrerede opkøbere.',
    legalReference: '1224/2009 art. 62; BEK 1144/2025',
    feltkatalogRefs: ['Bilag XIX'],
  },
  {
    id: 'sys_flux',
    column: 'systems',
    titleDa: 'FLUX / EFCA Gateway',
    subtitleDa: 'EU Dataudvekslingsnetværk',
    category: 'EU-Gateway',
    descriptionDa: 'UN/CEFACT FLUX datastandarden til sikker dataudveksling af VMS, ERS, inspektionsrapporter og kvotedata mellem medlemsstaterne, Kommissionen og EFCA.',
    legalReference: '2025/2196 Bilag XVII (FLUX-standarder)',
  },
  {
    id: 'sys_catch',
    column: 'systems',
    titleDa: 'CATCH Systemet',
    subtitleDa: 'EU Fangstcertifikat-portal',
    category: 'Import/Eksport',
    descriptionDa: 'Obligatorisk EU-portal fra 10. januar 2026 til digital håndtering og kontrol af fangstattester ved import og eksport for at hindre IUU-fiskeri.',
    introducedYear: 2026,
    legalReference: '1005/2008 art. 12; 2023/2842 Bilag II',
  },
  {
    id: 'sys_cctv',
    column: 'systems',
    titleDa: 'REM / CCTV Database',
    subtitleDa: 'Kamera- og sensordata',
    category: 'Sensorik',
    descriptionDa: 'Lagring og AI-analyse af videodata og sensorsignaler (tromlesensorer) fra fartøjer omfattet af elektronisk fjernovervågning (frivillig i Kattegat i dag, lovkrav fra 2028).',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 13; BEK 240/2025',
  },
  {
    id: 'sys_validation_db',
    column: 'systems',
    titleDa: 'Automatiseret Datavalidering',
    subtitleDa: 'Art. 109 Valideringsmotor',
    category: 'Krydskontrol',
    descriptionDa: 'Den lovpligtige valideringsdatabase (deadline 2027-01-10), der automatiseret krydskontrollerer VMS-spor mod eLog, PNO mod ankomst og landing mod salgsnotaer.',
    introducedYear: 2026,
    legalReference: '1224/2009 art. 109; 2025/2196 art. 49-53',
  },

  // --- COLUMN 4: REGELSÆT & HJEMMEL ---
  {
    id: 'reg_1224_2009',
    column: 'regulations',
    titleDa: 'EU 1224/2009 (Kontrolforordningen)',
    subtitleDa: 'Grundpillen for kontrol og sanktion',
    category: 'EU-Forordning',
    descriptionDa: 'Hovedforordningen for fiskerikontrol. Fastsætter krav til VMS (art. 9), logbog (art. 14), PNO (art. 17), landing (art. 23), salgsnota (art. 62) og point (art. 92).',
    legalReference: 'CELEX 32009R1224',
  },
  {
    id: 'reg_2023_2842',
    column: 'regulations',
    titleDa: 'EU 2023/2842 (Kontrolrevisionen)',
    subtitleDa: 'Moderniseringspakken 2026-2028',
    category: 'EU-Forordning',
    descriptionDa: 'Omfattende revision af kontrolforordningen. Indfører obligatorisk eLog/VMS for småbåde (2028), CCTV (2028), vejetilladelser (2026) og harmoniserede sanktioner.',
    introducedYear: 2026,
    legalReference: 'CELEX 32023R2842 (Art. 7 er fristetabellen)',
  },
  {
    id: 'reg_2025_2196',
    column: 'regulations',
    titleDa: 'EU 2025/2196 (Gennemførelsesforordning)',
    subtitleDa: 'Dataformater & Feltkatalog',
    category: 'EU-Forordning',
    descriptionDa: 'Afløser forordning 404/2011. Etablerer de konkrete tekniske specifikationer for datavalidering (art. 49-53) og indeholder Bilag I-XIX feltkatalogen for ERS og salg.',
    introducedYear: 2026,
    legalReference: 'CELEX 32025R2196',
    feltkatalogRefs: ['Bilag I-XIX'],
  },
  {
    id: 'reg_1380_2013',
    column: 'regulations',
    titleDa: 'EU 1380/2013 (CFP Grundforordningen)',
    subtitleDa: 'Fælles fiskeripolitik & Landingspligt',
    category: 'EU-Forordning',
    descriptionDa: 'Fastlægger den fælles fiskeripolitik. Indeholder den overordnede definitionsliste (art. 4), kvoteprincipper (art. 16) og landingsforpligtelsen mod discard (art. 15).',
    legalReference: 'CELEX 32013R1380 art. 4 & 15',
  },
  {
    id: 'reg_2019_1241',
    column: 'regulations',
    titleDa: 'EU 2019/1241 (Tekniske Foranstaltninger)',
    subtitleDa: 'Maskestørrelser & Redskaber',
    category: 'EU-Forordning',
    descriptionDa: 'Regulerer tilladte redskaber, maskestørrelser, selektionsriste og bevarelsesmæssige mindstemål (MCRS) i Nordsøen, Skagerrak og Østersøen.',
    legalReference: 'CELEX 32019R1241',
  },
  {
    id: 'reg_fiskeriloven',
    column: 'regulations',
    titleDa: 'Fiskeriloven (LBK 205/2023)',
    subtitleDa: 'National hjemmelslov',
    category: 'Dansk Lov',
    descriptionDa: 'Den danske grundlov for erhvervs- og lystfiskeri. Bemyndiger ministeren til at udstede bekendtgørelser og giver kontrollører magtbeføjelser i § 117-122.',
    legalReference: 'LBK nr. 205 af 01/03/2023',
  },
  {
    id: 'reg_bek_1197_logbog',
    column: 'regulations',
    titleDa: 'BEK 1197/2025 (Logbogsbekendtgørelsen)',
    subtitleDa: 'Dansk eLog & Toleranceregler',
    category: 'Dansk Bekendtgørelse',
    descriptionDa: 'National udmøntning af kontrolforordningens art. 14-15a om føring af logbog, registrering af halinger og overholdelse af 10 % tolerancemargen.',
    legalReference: 'BEK nr 1197 af 07/10/2025',
  },
  {
    id: 'reg_bek_1144_landing',
    column: 'regulations',
    titleDa: 'BEK 1144/2025 (Landingsbekendtgørelsen)',
    subtitleDa: 'Registrering af landet fisk & salgsnota',
    category: 'Dansk Bekendtgørelse',
    descriptionDa: 'Regler om landingsopgørelser, forhåndsmeddelelser, vejekrav, opkøberregistrering og elektroniske salgsnotaer i det første omsætningsled.',
    legalReference: 'BEK nr 1144 af 25/09/2025',
  },
  {
    id: 'reg_bek_1571_regulering',
    column: 'regulations',
    titleDa: 'BEK 1571/2025 (Reguleringsbekendtgørelsen)',
    subtitleDa: 'Kvoter, rationer og puljer',
    category: 'Dansk Bekendtgørelse',
    descriptionDa: 'Styrelsens årlige hovedbekendtgørelse for fordeling af fiskerimuligheder, årsmængder, FKA- og IOK-ordninger samt vilkår for kystfiskerordningen.',
    legalReference: 'BEK nr 1571 af 04/12/2025',
  },
  {
    id: 'reg_bek_978_point',
    column: 'regulations',
    titleDa: 'BEK 978/2019 (Pointbekendtgørelsen)',
    subtitleDa: 'Sanktionssystem for alvorlige brud',
    category: 'Dansk Bekendtgørelse',
    descriptionDa: 'Dansk administrativ gennemførelse af EU-pointsystemet. Tildeler point til fartøjsførere og licenshavere ved grove overtrædelser (jf. art. 92).',
    legalReference: 'BEK nr 978 af 22/09/2019',
  },
  {
    id: 'reg_bek_240_cctv',
    column: 'regulations',
    titleDa: 'BEK 240/2025 (Kattegat CCTV)',
    subtitleDa: 'Frivillig elektronisk monitorering',
    category: 'Dansk Bekendtgørelse',
    descriptionDa: 'Dansk særordning om frivillig kameradokumentation af jomfruhummerfiskeri i Kattegat som beskyttelse af torskebestanden.',
    legalReference: 'BEK nr 240 af 28/02/2025',
  },
];

export const MATRIX_EDGES: MatrixEdge[] = [
  // --- AKTØRER ➔ HÆNDELSER ---
  // Mikro (<8m)
  { sourceId: 'actor_micro', targetId: 'evt_license', yearValidFrom: 2026, roleDa: 'Har licens / FKA' },
  { sourceId: 'actor_micro', targetId: 'evt_departure', yearValidFrom: 2028, roleDa: 'Sporet via mobilapp fra 2028', noteDa: 'I dag papir/farvandserklæring' },
  { sourceId: 'actor_micro', targetId: 'evt_catch', yearValidFrom: 2028, roleDa: 'Elektronisk logbog fra 2028', noteDa: 'I dag undtaget for eLog' },
  { sourceId: 'actor_micro', targetId: 'evt_first_sale', yearValidFrom: 2026, roleDa: 'Sælger fangst via opkøber' },

  // Kyst (8-12m)
  { sourceId: 'actor_coastal', targetId: 'evt_license', yearValidFrom: 2026, roleDa: 'Licens og puljeandel' },
  { sourceId: 'actor_coastal', targetId: 'evt_departure', yearValidFrom: 2028, roleDa: 'VMS krav fra 2028', noteDa: 'Overgangsregel 404/2011' },
  { sourceId: 'actor_coastal', targetId: 'evt_catch', yearValidFrom: 2028, roleDa: 'eLog krav fra 2028', noteDa: 'Overgangsregel 404/2011' },
  { sourceId: 'actor_coastal', targetId: 'evt_pno', yearValidFrom: 2028, roleDa: 'PNO fra 2028 ved udvalgte havne' },
  { sourceId: 'actor_coastal', targetId: 'evt_quay_inspect', yearValidFrom: 2026, roleDa: 'Stikprøvekontrol' },
  { sourceId: 'actor_coastal', targetId: 'evt_weighing', yearValidFrom: 2026, roleDa: 'Får vejet fangst' },
  { sourceId: 'actor_coastal', targetId: 'evt_first_sale', yearValidFrom: 2026, roleDa: 'Afregner fangst' },

  // Mellem (12-18m)
  { sourceId: 'actor_medium', targetId: 'evt_license', yearValidFrom: 2026, roleDa: 'FKA rettighed' },
  { sourceId: 'actor_medium', targetId: 'evt_departure', yearValidFrom: 2026, roleDa: 'Obligatorisk VMS' },
  { sourceId: 'actor_medium', targetId: 'evt_catch', yearValidFrom: 2026, roleDa: 'Obligatorisk eLog' },
  { sourceId: 'actor_medium', targetId: 'evt_sea_inspect', yearValidFrom: 2026, roleDa: 'Bordes til søs' },
  { sourceId: 'actor_medium', targetId: 'evt_pno', yearValidFrom: 2026, roleDa: 'Indsender PNO (4t)' },
  { sourceId: 'actor_medium', targetId: 'evt_landing', yearValidFrom: 2026, roleDa: 'Landingserklæring' },
  { sourceId: 'actor_medium', targetId: 'evt_quay_inspect', yearValidFrom: 2026, roleDa: 'Kajkontrol / Vejekontrol' },
  { sourceId: 'actor_medium', targetId: 'evt_weighing', yearValidFrom: 2026, roleDa: 'Vejes ved landing' },
  { sourceId: 'actor_medium', targetId: 'evt_first_sale', yearValidFrom: 2026, roleDa: 'Salgsnota' },

  // Stor (>18/24m)
  { sourceId: 'actor_large', targetId: 'evt_license', yearValidFrom: 2026, roleDa: 'Stor FKA/IOK kvote' },
  { sourceId: 'actor_large', targetId: 'evt_departure', yearValidFrom: 2026, roleDa: 'Kontinuerlig VMS' },
  { sourceId: 'actor_large', targetId: 'evt_catch', yearValidFrom: 2026, roleDa: 'eLog & Maskinovervågning' },
  { sourceId: 'actor_large', targetId: 'evt_sea_inspect', yearValidFrom: 2026, roleDa: 'Frekvent søkontrol' },
  { sourceId: 'actor_large', targetId: 'evt_pno', yearValidFrom: 2026, roleDa: 'PNO altid påkrævet' },
  { sourceId: 'actor_large', targetId: 'evt_landing', yearValidFrom: 2026, roleDa: 'Masse-losning' },
  { sourceId: 'actor_large', targetId: 'evt_quay_inspect', yearValidFrom: 2026, roleDa: 'Højrisiko kontrol' },
  { sourceId: 'actor_large', targetId: 'evt_weighing', yearValidFrom: 2026, roleDa: 'Industrivejning' },
  { sourceId: 'actor_large', targetId: 'evt_first_sale', yearValidFrom: 2026, roleDa: 'Auktion / Fabrikssalg' },

  // Opkøber / Auktion
  { sourceId: 'actor_buyer', targetId: 'evt_weighing', yearValidFrom: 2026, roleDa: 'Overvåger vejning' },
  { sourceId: 'actor_buyer', targetId: 'evt_first_sale', yearValidFrom: 2026, roleDa: 'Udsteder salgsnota (48t)' },
  { sourceId: 'actor_buyer', targetId: 'evt_transport', yearValidFrom: 2026, roleDa: 'Danner partier' },

  // Vejeoperatør
  { sourceId: 'actor_weighing', targetId: 'evt_weighing', yearValidFrom: 2026, roleDa: 'Udfører autoriseret vejning' },

  // Transportør
  { sourceId: 'actor_transporter', targetId: 'evt_transport', yearValidFrom: 2026, roleDa: 'Fører transportdokument' },

  // Fiskeristyrelsen
  { sourceId: 'actor_agency', targetId: 'evt_sea_inspect', yearValidFrom: 2026, roleDa: 'Udfører søtilsyn' },
  { sourceId: 'actor_agency', targetId: 'evt_pno', yearValidFrom: 2026, roleDa: 'Modtager varsel i FMC' },
  { sourceId: 'actor_agency', targetId: 'evt_quay_inspect', yearValidFrom: 2026, roleDa: 'Udfører kajtilsyn' },
  { sourceId: 'actor_agency', targetId: 'evt_crosscheck', yearValidFrom: 2026, roleDa: 'Kører krydskontrol & sanktion' },

  // --- HÆNDELSER ➔ IT-SYSTEMER ---
  { sourceId: 'evt_license', targetId: 'sys_fos_sales', yearValidFrom: 2026, roleDa: 'Stamdata og kvoter' },
  { sourceId: 'evt_departure', targetId: 'sys_fos_vms', yearValidFrom: 2026, roleDa: 'Positionspings (VMS)' },
  { sourceId: 'evt_departure', targetId: 'sys_fmc', yearValidFrom: 2026, roleDa: 'FMC geofence alarmer' },
  { sourceId: 'evt_catch', targetId: 'sys_elog', yearValidFrom: 2026, roleDa: 'Halinger i eLog' },
  { sourceId: 'evt_catch', targetId: 'sys_cctv', yearValidFrom: 2028, roleDa: 'Kamerastyret dokumentation', noteDa: 'Frivillig i Kattegat 2026' },
  { sourceId: 'evt_sea_inspect', targetId: 'sys_fmc', yearValidFrom: 2026, roleDa: 'EIR bordingrapport til FMC' },
  { sourceId: 'evt_sea_inspect', targetId: 'sys_flux', yearValidFrom: 2026, roleDa: 'Inspektionsrapport til EFCA' },
  { sourceId: 'evt_pno', targetId: 'sys_fmc', yearValidFrom: 2026, roleDa: '4t varsel til FMC' },
  { sourceId: 'evt_pno', targetId: 'sys_elog', yearValidFrom: 2026, roleDa: 'Genereres i eLog' },
  { sourceId: 'evt_landing', targetId: 'sys_elog', yearValidFrom: 2026, roleDa: 'Landingserklæring i eLog' },
  { sourceId: 'evt_weighing', targetId: 'sys_fos_sales', yearValidFrom: 2026, roleDa: 'Vejeresultat overføres' },
  { sourceId: 'evt_first_sale', targetId: 'sys_fos_sales', yearValidFrom: 2026, roleDa: 'Salgsnota registreres i FOS' },
  { sourceId: 'evt_first_sale', targetId: 'sys_catch', yearValidFrom: 2026, roleDa: 'Fangstcertifikat CATCH' },
  { sourceId: 'evt_transport', targetId: 'sys_flux', yearValidFrom: 2028, roleDa: 'EU dataudveksling (art. 63)' },
  { sourceId: 'evt_crosscheck', targetId: 'sys_validation_db', yearValidFrom: 2026, roleDa: 'Automatiseret valideringsmotor' },
  { sourceId: 'evt_crosscheck', targetId: 'sys_fos_sales', yearValidFrom: 2026, roleDa: 'Kvotetræk og point' },

  // --- HÆNDELSER ➔ REGELSÆT ---
  { sourceId: 'evt_license', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Hjemmel: art. 6-7' },
  { sourceId: 'evt_license', targetId: 'reg_bek_1571_regulering', yearValidFrom: 2026, roleDa: 'National regulering' },
  { sourceId: 'evt_departure', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'VMS: art. 9' },
  { sourceId: 'evt_departure', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'MDR specifikation art. 19-23' },
  { sourceId: 'evt_catch', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Logbog: art. 14' },
  { sourceId: 'evt_catch', targetId: 'reg_1380_2013', yearValidFrom: 2026, roleDa: 'Landingsforpligtelse art. 15' },
  { sourceId: 'evt_catch', targetId: 'reg_bek_1197_logbog', yearValidFrom: 2026, roleDa: 'Dansk eLog bekendtgørelse' },
  { sourceId: 'evt_catch', targetId: 'reg_2023_2842', yearValidFrom: 2028, roleDa: 'Småbåde <12m art. 15a' },
  { sourceId: 'evt_sea_inspect', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Inspektion til søs: art. 71-77' },
  { sourceId: 'evt_sea_inspect', targetId: 'reg_2019_1241', yearValidFrom: 2026, roleDa: 'Maskestørrelser & redskaber' },
  { sourceId: 'evt_sea_inspect', targetId: 'reg_fiskeriloven', yearValidFrom: 2026, roleDa: 'Beføjelser: § 117-122' },
  { sourceId: 'evt_pno', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'PNO frist: art. 17' },
  { sourceId: 'evt_pno', targetId: 'reg_bek_1144_landing', yearValidFrom: 2026, roleDa: 'Dansk anløbsbekendtgørelse' },
  { sourceId: 'evt_landing', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Landingserklæring: art. 23' },
  { sourceId: 'evt_landing', targetId: 'reg_bek_1144_landing', yearValidFrom: 2026, roleDa: 'Dansk landingsopgørelse' },
  { sourceId: 'evt_quay_inspect', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Havnekontrol: art. 78-88' },
  { sourceId: 'evt_quay_inspect', targetId: 'reg_bek_1197_logbog', yearValidFrom: 2026, roleDa: '10% tolerancecheck' },
  { sourceId: 'evt_weighing', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Vejekrav: art. 60-61' },
  { sourceId: 'evt_first_sale', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Salgsnota: art. 62-65' },
  { sourceId: 'evt_first_sale', targetId: 'reg_bek_1144_landing', yearValidFrom: 2026, roleDa: 'Dansk 48t frist' },
  { sourceId: 'evt_first_sale', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'Bilag XIX feltkatalog' },
  { sourceId: 'evt_transport', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Transportdokument: art. 68' },
  { sourceId: 'evt_crosscheck', targetId: 'reg_1224_2009', yearValidFrom: 2026, roleDa: 'Krydskontrol art. 109 & Point art. 92' },
  { sourceId: 'evt_crosscheck', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'Valideringsregler art. 49-53' },
  { sourceId: 'evt_crosscheck', targetId: 'reg_bek_978_point', yearValidFrom: 2026, roleDa: 'Dansk pointtildeling' },

  // --- IT-SYSTEMER ➔ REGELSÆT ---
  { sourceId: 'sys_elog', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'Bilag XV datastandarder' },
  { sourceId: 'sys_fos_vms', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'Bilag VI overvågningsformater' },
  { sourceId: 'sys_cctv', targetId: 'reg_bek_240_cctv', yearValidFrom: 2026, roleDa: 'Kattegat kameraforsøg' },
  { sourceId: 'sys_cctv', targetId: 'reg_2023_2842', yearValidFrom: 2028, roleDa: 'EU art. 13 lovkrav' },
  { sourceId: 'sys_validation_db', targetId: 'reg_2025_2196', yearValidFrom: 2026, roleDa: 'Art. 49-53 valideringsregler' },
];

/**
 * Traversal helper: Returns all connected node IDs for a selected node,
 * respecting the active timeline filter (2026 vs. 2028).
 */
export function getConnectedNodes(nodeId: string, year: TimelineYear): Set<string> {
  const connected = new Set<string>();
  connected.add(nodeId);

  const activeEdges = MATRIX_EDGES.filter((edge) => edge.yearValidFrom <= year);

  // 1st degree: find directly adjacent nodes
  const directNeighbors = new Set<string>();
  for (const edge of activeEdges) {
    if (edge.sourceId === nodeId) {
      directNeighbors.add(edge.targetId);
      connected.add(edge.targetId);
    } else if (edge.targetId === nodeId) {
      directNeighbors.add(edge.sourceId);
      connected.add(edge.sourceId);
    }
  }

  // 2nd degree: find neighbors of direct neighbors to bridge all 4 columns
  for (const neighborId of directNeighbors) {
    for (const edge of activeEdges) {
      if (edge.sourceId === neighborId) {
        connected.add(edge.targetId);
      } else if (edge.targetId === neighborId) {
        connected.add(edge.sourceId);
      }
    }
  }

  return connected;
}

/**
 * Edge lookup helper: Returns edges relevant to a node or a connected set.
 */
export function getActiveEdgesForNode(nodeId: string, year: TimelineYear): MatrixEdge[] {
  const connected = getConnectedNodes(nodeId, year);
  return MATRIX_EDGES.filter(
    (edge) =>
      edge.yearValidFrom <= year &&
      (edge.sourceId === nodeId ||
        edge.targetId === nodeId ||
        (connected.has(edge.sourceId) && connected.has(edge.targetId)))
  );
}
