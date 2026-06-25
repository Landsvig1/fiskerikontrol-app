# Plan: Dynamisk PDF-Upload og Server-side Parsing

Dato: 2026-06-25  
Forfatter: Kasper Landsvig / Antigravity

---

## 1. Problemstilling & Omfang (Problem Frame & Scope)

### Problem
Fiskerikontrol-appen bruger i øjeblikket en statisk JSON-fil (`public/data/graph_data.json`), som er præ-genereret af et lokalt Python-script. Hvis en bruger ønsker at analysere nye reguleringer, skal de køre scriptet lokalt på deres maskine. Desuden fungerer denne løsning ikke efter deployment på Vercel, da Vercel Serverless Functions ikke har adgang til en lokal Python-installation med `fitz`-biblioteket.

### Omfang
Vi vil omdanne appen til en fuldt dynamisk webapplikation ved at implementere en web-baseret upload-brugergrænseflade og en server-side parser i TypeScript, som kan køre direkte i Next.js API Routes på Vercel.

**Inden for scope:**
* Etablering af Next.js API Route (`src/app/api/parse/route.ts`) til modtagelse og parsing af PDF-filer.
* Integration af en pure-JS PDF parser (`pdf-parse`) i Next.js servermiljøet.
* Omsættelse af den eksisterende Python NLP/regex citation- og konfliktdetektions-logik til ren TypeScript/JavaScript.
* Opdatering af frontend-brugergrænsefladen (`src/app/page.tsx`) til at understøtte drag-and-drop PDF-upload, vise en fremskridtsindikator og indlæse den genererede graf-struktur direkte i applikationens state.

**Uden for scope:**
* Opbevaring af PDF-filer i en cloud storage (S3/Vercel Blob) – parsing sker in-memory, og resultatet sendes direkte tilbage som JSON til klienten.
* Avanceret OCR til scannede PDF-filer (vi antager at PDF'erne indeholder rå tekst-lag som EU-tidende-dokumenterne).

---

## 2. Foreslåede Ændringer (Proposed Changes)

Følgende filer vil blive tilføjet eller ændret:

* **Ny fil: `src/app/api/parse/route.ts`**
  Next.js API endpoint, der modtager PDF-filer via Multipart FormData, parser dem via `pdf-parse`, kører regulære udtryk til at hente artikler, finder krydsreferencer/modaliteter og detekterer overlap/konflikter.
* **Ny fil: `src/lib/parser.ts`**
  Hjælpe-bibliotek (helper library) indeholdende parse-algoritmerne portet fra Python til TypeScript (artikel-opdeling, tema-detektering, modalitets-klassificering og konflikt-check).
* **Ændret fil: `src/app/page.tsx`**
  Integration af upload-interface på Dashboardet (Drag & Drop zone, fil-validering og API POST-kald). App-state opdateres dynamisk med det returnerede JSON-svar i stedet for at hente fra `/data/graph_data.json`.
* **Ny test-fil: `src/lib/__tests__/parser.test.ts`**
  Unit tests til validering af regulære udtryk, citation-ekstraktion og modalklassificering.

---

## 3. Tekniske Beslutninger (Technical Decisions)

### 3.1 Server-side PDF Parsing med `pdf-parse`
* **Valg**: `pdf-parse` (pure JavaScript).
* **Alternativ**: Køre et lokalt Python child-process.
* **Afvejning**: Pure JavaScript tillader serverless eksekvering på Vercel uden yderligere dependencies. Python child-processes vil fejle i standard serverless miljøer.

### 3.2 In-memory Processering
* **Valg**: PDF-filerne gemmes ikke på disken. De uploadede filer parses direkte som Buffers in-memory i API-routen.
* **Afvejning**: Reducerer kompleksitet og fjerner behovet for cloud storage og database-oprydning, men begrænser maksimal filstørrelse til Next.js Serverless payload limit (~4.5MB). Dette er fuldt tilstrækkeligt for EU-reguleringer (typisk under 2MB).

---

## 4. Testscenarier & Verifikation (Verification & Test Scenarios)

### 4.1 Unit Tests for parser (`src/lib/__tests__/parser.test.ts`)
* **Test 1: Artikel-segmentering**: Verificer at tekst indeholdende *"Artikel 1\nGenstand..."* og *"Artikel 2\nAnvendelsesområde..."* korrekt opdeles i to separate noder.
* **Test 2: Modalklassificering**:
  * Input: *"Uanset artikel 14, stk. 1, gælder..."* -> Forventet modalitet: `Exception`
  * Input: *"Føreren skal registrere..."* -> Forventet modalitet: `Obligation`
* **Test 3: Konfliktdetektion**: Verificer at modstridende modaliteter (`Exception` og `Obligation`) for samme target-artikel korrekt flages som en konflikt.

### 4.2 Integrationstest (E2E)
* Upload af de to oprindelige forordninger via UI. Verificer at Dashboardet opdateres og viser præcis **297 noder** og **9 konflikter**.

---

## 5. Risici & Gaps (Risks & Gaps)

* **Vercel Execution Timeout**: Store PDF-filer (100+ sider) kan tage over 10 sekunder at parse på langsomme serverless instanser.
  * *Mitigering*: Optimering af regex og begrænsning af unødvendige løkker i krydskontrol-algoritmen.
* **Metadata tab**: `pdf-parse` udtrækker rå tekst, men taber formatering (som fed skrift til overskrifter).
  * *Mitigering*: Parseren bruger string boundaries (`\n`) og artikeltal frem for skrifttype-tykkelser til at lokalisere overskrifter.
