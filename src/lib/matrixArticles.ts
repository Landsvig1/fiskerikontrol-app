/**
 * Fiskeristyrelsen: Retskatalog & Artikelhenvisninger
 *
 * Detailed article-level legal grounding for EU Control Regulations and
 * Danish ministerial orders (bekendtgørelser), mapping exact provisions
 * and legal obligations.
 */

export interface ArticleDetail {
  article: string;
  titleDa: string;
  summaryDa: string;
  relevanceDa?: string;
  yearIntroduced?: 2026 | 2028;
}

export interface RegulationArticles {
  regulationId: string;
  shortTitleDa: string;
  fullTitleDa: string;
  celexOrBekNr: string;
  articles: ArticleDetail[];
}

export const REGULATION_ARTICLES: Record<string, RegulationArticles> = {
  reg_1224_2009: {
    regulationId: "reg_1224_2009",
    shortTitleDa: "EU 1224/2009 (Kontrolforordningen)",
    fullTitleDa: "Rådets forordning (EF) nr. 1224/2009 om oprettelse af en EF-kontrolordning",
    celexOrBekNr: "CELEX 32009R1224",
    articles: [
      {
        article: "Art. 6-7",
        titleDa: "Fiskerilicens & Fiskeritilladelse",
        summaryDa: "Et EU-fiskerfartøj må kun anvendes til erhvervsmæssig udnyttelse af levende akvatiske ressourcer, hvis det har en gyldig fiskerilicens og specifik tilladelse.",
        relevanceDa: "Hjemmel til tildeling af FKA/IOK kvoter og fiskerirettigheder.",
      },
      {
        article: "Art. 9",
        titleDa: "Fartøjsovervågningssystem (VMS/FOS)",
        summaryDa: "Fartøjer skal have installeret en fuldt funktionsdygtig VMS-enhed, der automatisk transmitterer position, kurs og fart hvert 10.-30. minut til FMC.",
        relevanceDa: "Gælder i 2026 for fartøjer ≥12m. Fra 10. januar 2028 også obligatorisk for småbåde <12m via mobil-sporing.",
      },
      {
        article: "Art. 14",
        titleDa: "Elektronisk Logbog (eLog) & 10% Margen",
        summaryDa: "Føreren skal registrere alle operationer halingsvis. For alle arter gælder en maksimal tilladt tolerancemargen på 10 % mellem skippers estimat og den faktiske vejede mængde.",
        relevanceDa: "Grundstenen i fangstdokumentation og overholdelse af landingsforpligtelsen.",
      },
      {
        article: "Art. 15a",
        titleDa: "Elektronisk registrering for fartøjer < 12m",
        summaryDa: "Indført ved EU 2023/2842: Forpligter små kystfartøjer til før anløb eller landing at indsende en elektronisk fangsterklæring.",
        relevanceDa: "Træder i kraft 10. januar 2028. I 2026 er fartøjer <12m undtaget.",
        yearIntroduced: 2028,
      },
      {
        article: "Art. 17",
        titleDa: "Forudgående Anmeldelse af Anløb (PNO)",
        summaryDa: "Førere af fartøjer ≥12m skal anmelde anløb til myndigheden mindst 4 timer før ankomst til havn med angivelse af havn, tidspunkt og ombordværende fangster.",
        relevanceDa: "Giver FMC og lokale kontrollører mulighed for at planlægge kajkontrol og vejetilsyn.",
      },
      {
        article: "Art. 23",
        titleDa: "Elektronisk Landingserklæring (LAN)",
        summaryDa: "Efter hver landing skal fartøjsføreren udfylde og indsende en elektronisk landingserklæring til flagstatens myndighed senest inden 24 timer.",
        relevanceDa: "Fartøjer <12m er fritaget for eLog LAN i 2026 (her træder opkøbers salgsnota i stedet).",
      },
      {
        article: "Art. 60-61",
        titleDa: "Vejekrav ved Landing & Vejetilladelse",
        summaryDa: "Al landet fisk skal vejes umiddelbart ved landing på godkendte, plomberede vægte af autoriserede vejeoperatører, før fisken må videretransporteres eller sælges.",
        relevanceDa: "Skærpet 10. januar 2026: Vejning skal ske efter en forhåndsgodkendt kontrolplan.",
      },
      {
        article: "Art. 62-65",
        titleDa: "Elektronisk Salgsnota fra Førsteopkøber",
        summaryDa: "Førsteopkøbere, auktioner og godkendte modtagere er forpligtet til elektronisk at indsende en salgsnota inden 48 timer efter første salg.",
        relevanceDa: "For kystfiskere <12m er salgsnotaen i 2026 den eneste myndighedsregistrering af fangstmængden.",
      },
      {
        article: "Art. 68",
        titleDa: "Transportdokument for Fiskevarer",
        summaryDa: "Ved transport af uforarbejdede fiskevarer, der endnu ikke er solgt eller vejet, skal et transportdokument ledsage partiet og indsendes elektronisk.",
        relevanceDa: "Sikrer sporbarhed fra kajkanten til forarbejdningsvirksomhed eller auktion.",
      },
      {
        article: "Art. 71-88",
        titleDa: "Kontrolbeføjelser til Søs & i Havn",
        summaryDa: "Bemyndiger kontrolfartøjer (Havørnen, Vestkysten) og havnekontrollører til bording, redskabsmåling, inspektion af lastrum og udarbejdelse af inspektionsrapporter.",
        relevanceDa: "Juridisk grundlag for fysisk tilsyn, vejekontrol og optagelse af forseelsessager.",
      },
      {
        article: "Art. 92",
        titleDa: "Pointsystem for Alvorlige Overtrædelser",
        summaryDa: "Forpligter medlemsstaterne til at tildele point til fiskerilicenshavere og skippere ved alvorlige overtrædelser (fx overtrædelse af 10% tolerancemargen eller manglende VMS).",
        relevanceDa: "Udmøntet i dansk ret via BEK 978/2019.",
      },
      {
        article: "Art. 109",
        titleDa: "Automatiseret Krydskontrol & Datavalidering",
        summaryDa: "Myndighederne skal oprette et automatiseret computervalideringssystem, der krydstjekker VMS-spor, eLog-data, PNO-varsler, vejede salgsnotaer og landingserklæringer.",
        relevanceDa: "Fiskeristyrelsens valideringsmotor (Art. 49-53) genererer automatiske flag ved uoverensstemmelser.",
      },
    ],
  },

  reg_2023_2842: {
    regulationId: "reg_2023_2842",
    shortTitleDa: "EU 2023/2842 (Kontrolrevisionen)",
    fullTitleDa: "Europa-Parlamentets og Rådets forordning (EU) 2023/2842 om ændring af kontrolforordningen",
    celexOrBekNr: "CELEX 32023R2842",
    articles: [
      {
        article: "Art. 13",
        titleDa: "Elektronisk Fjernovervågning (REM / CCTV)",
        summaryDa: "Obligatorisk installation af CCTV-kameraer og sensorer til kontinuerlig overvågning af landingsforpligtelsen for risikofartøjer ≥18m.",
        relevanceDa: "Træder i kraft 10. januar 2028 (efter 4 års overgangsperiode).",
        yearIntroduced: 2028,
      },
      {
        article: "Art. 15a",
        titleDa: "Obligatorisk Sporing & eLog for Småfartøjer",
        summaryDa: "Ophæver de hidtidige nationale undtagelser for fartøjer under 12 meter. Indfører obligatorisk mobil positionssporing og digital logbog.",
        relevanceDa: "Træder i kraft 10. januar 2028. Berører ca. 500-600 mindre danske fartøjer.",
        yearIntroduced: 2028,
      },
      {
        article: "Art. 39a-39c",
        titleDa: "Kontinuerlig Motoreffekt-Måling",
        summaryDa: "Fartøjer med høj risiko for motormanipulation skal udstyres med kontinuerlige fysiske sensorer, der måler og logger aksel- eller motoreffekt (kW).",
        relevanceDa: "Forhindrer ulovlig overskridelse af tilladt maskineffekt i trawl- og bomtrawlfiskeri.",
        yearIntroduced: 2028,
      },
      {
        article: "Art. 60, stk. 1a",
        titleDa: "Krav om Forhåndsgodkendt Vejeaktør",
        summaryDa: "Enhver der vejer fiskevarer ved landing skal være forhåndsgodkendt af de kompetente myndigheder og anvende kalibrerede, plomberede systemer.",
        relevanceDa: "Trådt i kraft 10. januar 2026. Udmøntet i BEK 1144/2025.",
      },
    ],
  },

  reg_2025_2196: {
    regulationId: "reg_2025_2196",
    shortTitleDa: "EU 2025/2196 (Gennemførelsesforordning)",
    fullTitleDa: "Kommissionens gennemførelsesforordning (EU) 2025/2196 om kontrolforordningens tekniske regler",
    celexOrBekNr: "CELEX 32025R2196",
    articles: [
      {
        article: "Art. 19-23",
        titleDa: "Positionsdata & VMS Transmissionsstandard",
        summaryDa: "Definerer de præcise datastrukturer, kryptering og rapporteringsintervaller for satellit- og mobilpositionsdata til FMC.",
        relevanceDa: "Understøtter både traditionel Inmarsat/Iridium VMS og den nye 2028 mobil-app for kystfiskere.",
      },
      {
        article: "Art. 49-53",
        titleDa: "Valideringsalgoritmer & Krydskontrol",
        summaryDa: "Fastlægger de automatiske valideringsregler: Tjekker om en afsejling har en matchende eLog, om VMS-fart matcher trawl-aktivitet, og om salgsnota matcher landed mængde.",
        relevanceDa: "Kernen i Fiskeristyrelsens automatiserede sagsåbningsmotor.",
      },
      {
        article: "Bilag VI",
        titleDa: "Datakatalog for Fartøjssporing",
        summaryDa: "Specifikation af alle obligatoriske felter i en positionsmeddelelse: breddegrad, længdegrad, kurs, fart, dato, tid og fartøjs-ID.",
        relevanceDa: "Teknisk standard for FMC og FOS.",
      },
      {
        article: "Bilag XV",
        titleDa: "Feltkatalog for Elektronisk Logbog (eLog)",
        summaryDa: "Indeholder feltdefinitionerne 1-44 for eLog: redskabstype, maskestørrelse, havområde, ICES-afsnit, art (FAO 3-alfa), estimeret vægt og halingstid.",
        relevanceDa: "Brugt i alle godkendte eLog-systemer i Danmark.",
      },
      {
        article: "Bilag XIX",
        titleDa: "Feltkatalog for Salgsnotaer & Omsætning",
        summaryDa: "Indeholder felterne 1-26 for salgsnotaer: opkøber-ID, fartøjsnavn, landingshavn, artskode, sortering, vejet vægt, pris og unikt fangstrejse-ID.",
        relevanceDa: "Teknisk grundlag for indberetning til FOS Salgsdatabase.",
      },
    ],
  },

  reg_1380_2013: {
    regulationId: "reg_1380_2013",
    shortTitleDa: "EU 1380/2013 (CFP Grundforordningen)",
    fullTitleDa: "Europa-Parlamentets og Rådets forordning (EU) nr. 1380/2013 om den fælles fiskeripolitik",
    celexOrBekNr: "CELEX 32013R1380",
    articles: [
      {
        article: "Art. 15",
        titleDa: "Landingsforpligtelsen (Discardforbud)",
        summaryDa: "Forpligter fiskere til at bringe samtlige fangster af kvoterede arter i land og modregne dem i kvoten. Udsmid af kvoterede arter er forbudt med snævre undtagelser.",
        relevanceDa: "Hovedårsagen til skærpet overvågning, 10% toleranceregel og krav om CCTV.",
      },
      {
        article: "Art. 16-17",
        titleDa: "Kvotefordeling & Gennemsigtighed",
        summaryDa: "Fastlægger princippet om relativ stabilitet og pålægger medlemsstaterne at anvende gennemskuelige og objektive kriterier ved national fordeling af fiskerimuligheder.",
        relevanceDa: "Danner grundlag for Danmarks FKA/IOK og kystfiskerordning.",
      },
    ],
  },

  reg_2019_1241: {
    regulationId: "reg_2019_1241",
    shortTitleDa: "EU 2019/1241 (Tekniske Foranstaltninger)",
    fullTitleDa: "Forordning (EU) 2019/1241 om bevarelse af fiskeressourcerne gennem tekniske foranstaltninger",
    celexOrBekNr: "CELEX 32019R1241",
    articles: [
      {
        article: "Art. 7-10",
        titleDa: "Tilladte Redskaber & Maskestørrelser",
        summaryDa: "Fastsætter specifikationer for lovlige fangstredskaber, herunder minimumsmaskestørrelser, selektionsriste og paneler i Nordsøen og Østersøen.",
        relevanceDa: "Kontrolleres af Havørnen og Vestkysten ved søtilsyn med kalibreret målekile.",
      },
      {
        article: "Art. 13 & Bilag",
        titleDa: "Bevarelsesmæssige Mindstemål (MCRS)",
        summaryDa: "Lister mindstemål for fiskearter (fx rødspætte, torsk, sild). Fisk under MCRS må ikke anvendes til direkte konsum, men skal landes jf. art. 15.",
        relevanceDa: "Kontrolleres ved stikprøver ved kajtilsyn og søbording.",
      },
    ],
  },

  reg_fiskeriloven: {
    regulationId: "reg_fiskeriloven",
    shortTitleDa: "Fiskeriloven (LBK 205/2023)",
    fullTitleDa: "Lov om fiskeri og fiskeopdræt (Fiskeriloven)",
    celexOrBekNr: "LBK nr. 205 af 01/03/2023",
    articles: [
      {
        article: "§ 10",
        titleDa: "Bemyndigelse til Reguleringsregler",
        summaryDa: "Giver ministeren hjemmel til at udstede administrative bekendtgørelser om regulering af fiskeriet, herunder kvoter, fartøjskategorier og redskaber.",
        relevanceDa: "Hjemmel for BEK 1571, BEK 1144 og BEK 1197.",
      },
      {
        article: "§ 117-119",
        titleDa: "Kontrollørernes Beføjelser til Tilsyn",
        summaryDa: "Fiskeristyrelsens kontrollører har til enhver tid mod behørig legitimation og uden retskendelse adgang til fiskerfartøjer, transportmidler, salgslokaler og vejeanlæg.",
        relevanceDa: "Grundlaget for fysiske inspektioner til søs og på land.",
      },
      {
        article: "§ 120-122",
        titleDa: "Tvangsmidler & Beslaglæggelse",
        summaryDa: "Kontrollører kan udstede påbud, tilbageholde fartøjer i havn og foretage beslaglæggelse af ulovlige redskaber eller ulovligt landede fangster.",
        relevanceDa: "Håndhævelse ved alvorlige overtrædelser af kvote- eller redskabsregler.",
      },
    ],
  },

  reg_bek_1144_landing: {
    regulationId: "reg_bek_1144_landing",
    shortTitleDa: "BEK 1144/2025 (Landingsbekendtgørelsen)",
    fullTitleDa: "Bekendtgørelse om landing af fisk, anløbsmelding, vejning og salgsnotaer",
    celexOrBekNr: "BEK nr 1144 af 25/09/2025",
    articles: [
      {
        article: "§ 3-4",
        titleDa: "Varsel for Forudgående Anmeldelse",
        summaryDa: "Fartøjer over 12 meter skal anmelde anløb elektronisk til FMC i Kolding mindst 4 timer før ankomst. Angivelse af estimeret mængde pr. art.",
        relevanceDa: "Dansk implementering af kontrolforordningens art. 17.",
      },
      {
        article: "§ 5-9",
        titleDa: "Godkendelse af Vejeoperatører",
        summaryDa: "Pr. 10. januar 2026 skal modtagere have skriftlig tilladelse som autoriseret vejeoperatør og følge en godkendt kontrolplan for vejning.",
        relevanceDa: "Obligatorisk for alle fiskeauktioner, samlecentraler og fiskeopkøbere.",
      },
      {
        article: "§ 12-16",
        titleDa: "48-timers Frist for Elektronisk Salgsnota",
        summaryDa: "Førsteopkøberen skal inden 48 timer efter afholdt auktion eller modtagelse indsende fuldstændig elektronisk salgsnota til FOS med unikt fangstrejse-ID.",
        relevanceDa: "Understøtter automatiseret krydskontrol mod fartøjets eLog.",
      },
    ],
  },

  reg_bek_1197_logbog: {
    regulationId: "reg_bek_1197_logbog",
    shortTitleDa: "BEK 1197/2025 (Logbogsbekendtgørelsen)",
    fullTitleDa: "Bekendtgørelse om elektronisk logbog og registrering af fiskeriaktiviteter",
    celexOrBekNr: "BEK nr 1197 af 07/10/2025",
    articles: [
      {
        article: "§ 2-6",
        titleDa: "Brug af Godkendt eLog-Klient",
        summaryDa: "Erhvervsfiskere skal anvende godkendt elektronisk logbogsprogrammel og sikre kontinuerlig satellit- eller datatransmission af alle meddelelser.",
        relevanceDa: "Understøtter afsejlingsrapport (DEP), fangstrapport (FAR) og anløbsrapport (COE).",
      },
      {
        article: "§ 7",
        titleDa: "10% Tolerancemargen ved Haling",
        summaryDa: "Estimeringen af fangst i logbogen må ikke afvige mere end 10 % fra den faktisk landede og vejede mængde for hver enkelt art.",
        relevanceDa: "Overtrædelse medfører automatisk kontrolsag og mulig tildeling af licenspoint.",
      },
      {
        article: "§ 10",
        titleDa: "Overgangsregler for Fartøjer < 12m",
        summaryDa: "Fartøjer under 12 meter er frem til 10. januar 2028 undtaget fra krav om elektronisk logbog under forudsætning af korrekt kystfiskerafregning.",
        relevanceDa: "Ophører endegyldigt den 10. januar 2028 jf. EU 2023/2842.",
      },
    ],
  },

  reg_bek_1571_regulering: {
    regulationId: "reg_bek_1571_regulering",
    shortTitleDa: "BEK 1571/2025 (Reguleringsbekendtgørelsen)",
    fullTitleDa: "Bekendtgørelse om regulering af fiskeriet for 2026",
    celexOrBekNr: "BEK nr 1571 af 04/12/2025",
    articles: [
      {
        article: "§ 8-15",
        titleDa: "FKA og IOK Kvotevilkår",
        summaryDa: "Fastlægger de årlige mængder og lånemuligheder for fartøjskvoteandele (konsumfartøjer) og individuelle overdragelige kvoteandele (pelagisk/industri).",
        relevanceDa: "Danner loftet for tilladte landinger i danske farvande.",
      },
      {
        article: "§ 20-25",
        titleDa: "Kystfiskerordningen (MAF)",
        summaryDa: "Særlige tildelinger af ekstra kvotemængder til skånsomme kystfiskere (garn, liner, snurrevod) med fartøjer op til 17 meter og ture under 24 timer.",
        relevanceDa: "Understøtter kystfiskeriet og stiller specifikke redskabsbetingelser.",
      },
    ],
  },

  reg_bek_978_point: {
    regulationId: "reg_bek_978_point",
    shortTitleDa: "BEK 978/2019 (Pointbekendtgørelsen)",
    fullTitleDa: "Bekendtgørelse om pointtildeling for alvorlige overtrædelser af fiskerilovgivningen",
    celexOrBekNr: "BEK nr 978 af 24/09/2019",
    articles: [
      {
        article: "§ 3 & Bilag 1",
        titleDa: "Pointkatalog for Alvorlige Overtrædelser",
        summaryDa: "Tildeler point (fx 3-7 point pr. overtrædelse) for kvoteunddragelse, manipulation af VMS, overskridelse af tolerancemargen eller manglende PNO.",
        relevanceDa: "Automatisk koblet til Fiskeristyrelsens validerings- og sagssystem.",
      },
      {
        article: "§ 7",
        titleDa: "Suspension af Fiskerilicens",
        summaryDa: "Når en licenshaver akkumulerer 18 point suspenderes fiskerilicensen automatisk i 2 måneder. Ved 36 point i 4 måneder; ved 72 point inddrages licensen permanent.",
        relevanceDa: "Kontrolmyndighedens strengeste administrative sanktion mod ulovligt fiskeri.",
      },
    ],
  },

  reg_bek_240_cctv: {
    regulationId: "reg_bek_240_cctv",
    shortTitleDa: "BEK 240/2020 (Kattegat CCTV)",
    fullTitleDa: "Bekendtgørelse om forsøg med elektronisk monitorering (CCTV) i Kattegat",
    celexOrBekNr: "BEK nr 240 af 16/03/2020",
    articles: [
      {
        article: "§ 1-5",
        titleDa: "Frivillig CCTV i Jomfruhummerfiskeriet",
        summaryDa: "Regler for fartøjer, der frivilligt installerer kamerasystemer i Kattegat mod at opnå lempede kvoter og adgang til jomfruhummerområder.",
        relevanceDa: "Forløberen for EU's obligatoriske 2028-CCTV krav under EU 2023/2842.",
      },
    ],
  },
};

/**
 * Returns article breakdown for a given regulation node ID.
 */
export function getArticlesForRegulation(regulationId: string): RegulationArticles | null {
  return REGULATION_ARTICLES[regulationId] || null;
}
